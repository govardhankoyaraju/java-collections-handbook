## 1. Learning Objectives

This lesson covers deep-dive points **16–24**: `put()`, `get()` and `remove()` execution, `computeIfAbsent()`, `computeIfPresent()`, `compute()`, `merge()`, `putIfAbsent()` and iteration mechanics.

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Most map code in business applications is an *update*: count an event, append to a per-customer list, cache a computed value, decrement a retry budget, remove an entry when it reaches zero. Written with `get` then `put`, each update hashes the key twice, needs a `null` check, and — when several threads are involved — is a race.

Java 8 added single-call update methods to `Map`: `putIfAbsent`, `computeIfAbsent`, `computeIfPresent`, `compute`, `merge`, `getOrDefault`. They are shorter and, in `HashMap`, they locate the bucket once. But each has precise, *different* rules about absent keys, `null` values and `null` function results. Getting them wrong produces silent data loss (a `null` result deleting an entry) or exceptions. This lesson traces exactly what each one does inside `HashMap`.

## 3. Beginner-Friendly Explanation

Think of the map as a filing cabinet and each method as an instruction to the clerk:

- `put(k, v)` — "file this under k, replacing anything there; tell me what was there."
- `get(k)` — "what is under k?" (nothing → `null`)
- `remove(k)` — "take out whatever is under k."
- `putIfAbsent(k, v)` — "file this under k **only if** the drawer is empty."
- `computeIfAbsent(k, f)` — "if the drawer is empty, **make** something with f and file it; give me what's in the drawer."
- `computeIfPresent(k, f)` — "if there is something, replace it with f(old) — and if f says *nothing*, empty the drawer."
- `compute(k, f)` — "replace whatever is there (maybe nothing) with f(old)."
- `merge(k, v, f)` — "if empty, file v; otherwise combine old and v with f."

In every case "f says nothing" (returns `null`) means **remove**.

## 4. Detailed Technical Explanation

### Point 16 — `put()` step by step

```java title="OpenJDK 25 · HashMap.putVal (abridged)"
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;                         // (1) lazy allocation
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);            // (2) empty bucket
    else {
        Node<K,V> e; K k;
        if (p.hash == hash && ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;                                           // (3) first node matches
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value); // (4) tree bin
        else {
            for (int binCount = 0; ; ++binCount) {           // (5) walk the chain
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);  //   append at tail
                    if (binCount >= TREEIFY_THRESHOLD - 1) treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash && ((k = e.key) == key || (key != null && key.equals(k))))
                    break;                                     //   existing key found
                p = e;
            }
        }
        if (e != null) {                                     // (6) existing mapping
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null) e.value = value;
            afterNodeAccess(e);                              //   LinkedHashMap hook
            return oldValue;                                 //   NO modCount change, NO size change
        }
    }
    ++modCount;                                              // (7) structural change
    if (++size > threshold) resize();                        // (8) grow after insert
    afterNodeInsertion(evict);                               //   LinkedHashMap eviction hook
    return null;
}
```

`put` is `putVal(hash(key), key, value, false, true)`. Replacing a value is **not** a structural modification: it does not increment `modCount`, so it does not break iterators.

### Point 17 — `get()`

`getNode(key)` computes the hash, indexes the table, checks the **first node** (the common case), then either asks the tree bin (`getTreeNode`) or walks the chain. `get` returns the value or `null`. Because `null` values are allowed, `null` is ambiguous; `containsKey` and `getOrDefault` resolve it (`getOrDefault` returns the default only when there is **no mapping**, not when the mapping's value is `null`).

### Point 18 — `remove()`

`removeNode` finds the node like `getNode`, remembering its predecessor `p`. Then: tree bin → `removeTreeNode` (may untreeify); first node → `tab[index] = node.next`; otherwise `p.next = node.next`. It increments `modCount`, decrements `size` and calls `afterNodeRemoval`. **The table never shrinks.** `remove(key, value)` uses the same method with `matchValue = true`.

### Points 19–23 — the compute family and `putIfAbsent`

| Method | Key absent (or mapped to `null`) | Key present with non-null value | Function returns `null` |
|---|---|---|---|
| `putIfAbsent(k, v)` | stores `v`, returns `null` | keeps old, returns old | — (no function) |
| `computeIfAbsent(k, f)` | stores `f(k)`, returns it | returns old, **f not called** | nothing stored, returns `null` |
| `computeIfPresent(k, f)` | returns `null`, **f not called** | stores `f(k, old)` | **removes the mapping** |
| `compute(k, f)` | stores `f(k, null)` | stores `f(k, old)` | removes (or no-op if absent) |
| `merge(k, v, f)` | stores `v` | stores `f(old, v)` | removes |

Additional rules:

- `merge` throws `NullPointerException` if `v` is `null` (and if `f` is `null`).
- All of them treat a key mapped to `null` like an absent key (`putIfAbsent` and `computeIfAbsent` overwrite it).
- **The function must not modify the map.** `HashMap`'s implementations record `modCount` before calling the function and throw `ConcurrentModificationException` if it changed (best effort; documented in the `HashMap` Javadoc since Java 9).

> [!CONTRACT]
> The `Map` interface specifies these semantics (including "if the function returns null, the mapping is removed") and provides default implementations. `HashMap` overrides them to locate the bucket once instead of calling `get` and `put` separately. The default implementations in `Map` are **not atomic**; `ConcurrentHashMap` overrides them to be atomic per key.

> [!IMPL]
> In OpenJDK 25, `computeIfAbsent`, `compute` and `merge` resize *before* searching if `size > threshold`, and insert a new node at the **head** of a plain bucket (`newNode(hash, key, v, first)`), unlike `put`, which appends at the tail and resizes after. Neither order nor timing is specified.

### Point 24 — Iteration mechanics

`keySet()`, `values()` and `entrySet()` iterators all extend `HashMap.HashIterator`:

1. The constructor records `expectedModCount = modCount` and advances to the first non-empty bucket.
2. `nextNode()` checks `modCount == expectedModCount` (else `ConcurrentModificationException`), returns the current node, then moves to `node.next` or scans forward for the next non-empty bucket.
3. `remove()` removes the last returned node via `removeNode(..., movable = false)` and refreshes `expectedModCount`.

Tree bins keep their nodes linked by `next` as well, so iteration treats them like chains. Iteration order is "bucket index ascending, chain order within a bucket" — an implementation artifact that changes after a resize and must never be relied upon. Cost: O(capacity + size).

`forEach(action)` and `replaceAll(function)` walk the table directly and check `modCount` once at the end.

## 5. Internal Implementation

Why `computeIfAbsent` is better than `containsKey` + `put` for a multimap — counting bucket searches:

```java
// 3 searches: containsKey, put, get
if (!map.containsKey(k)) map.put(k, new ArrayList<>());
map.get(k).add(v);

// 1 search (HashMap override): finds the node or the insertion point once
map.computeIfAbsent(k, x -> new ArrayList<>()).add(v);
```

And why `merge` is the idiomatic counter:

```java
counts.merge(word, 1, Integer::sum);   // absent → 1; present → old + 1; one bucket search
```

Step through `put` (including the replace path and resize) and `get`/`remove` in the simulator:

```viz
hashmap
```

## 6. Memory Representation

```text
put("job-2", 0) into bucket 7 that holds job-9 (same index, different hash):

before: table[7] ─► Node(job-9)
after:  table[7] ─► Node(job-9) ─► Node(job-2)        (put appends at the tail)

computeIfPresent("job-2", (k, v) -> v == 0 ? null : v):
        table[7] ─► Node(job-9)                          (null result → removeNode)

computeIfAbsent("job-5", k -> 1) with job-5 → bucket 7 (OpenJDK 25):
        table[7] ─► Node(job-5) ─► Node(job-9)            (inserted at the head)
```

## 7. Runnable Java Example

```example
m07/HashMapOperationsDemo
```

## 8. Execution Walkthrough

1. `totalsBroken` calls `totals.get(customer) + amount` on the first payment: `get` returns `null`, auto-unboxing to `long` throws `NullPointerException`.
2. `totals` uses `merge(customer, amount, Long::sum)`: absent → store the amount; present → add. acme = 125,000 + 50,000 = **175,000**.
3. `customersByStatus` uses `computeIfAbsent(status, s -> new ArrayList<>())` and appends to the returned list: a multimap in one line.
4. The compute family: `job-1` 2 → 1 via `computeIfPresent`; `job-2`'s function returns `null`, so the mapping is **removed**; `compute` on absent `job-3` receives `null` as the old value and stores 3.
5. `putIfAbsent` on a key mapped to `null` treats it as absent: it stores `"asha"` and returns `null`. A second call returns `"asha"` and changes nothing.
6. `computeIfAbsent` whose function returns `null` stores nothing — `containsKey` is `false`.
7. `merge` with a `null` value throws `NullPointerException`.
8. A mapping function that calls `cache.put` inside `computeIfAbsent` causes `ConcurrentModificationException` — HashMap detected that the map was modified during the computation.

## 9. Complexity Analysis

| Method | Bucket searches (HashMap) | Expected time |
|---|---|---|
| `get`, `containsKey`, `getOrDefault` | 1 | O(1) |
| `put`, `putIfAbsent` | 1 (+ resize, amortized) | O(1) amortized |
| `remove` | 1 | O(1) |
| `computeIfAbsent`, `compute`, `merge` | 1 (+ another for a remove on `null` result) | O(1) + cost of the function |
| `computeIfPresent` | 1 (+ 1 if the result is `null`) | O(1) + function |
| `containsValue` | scans everything | O(capacity + n) |
| iteration, `forEach`, `replaceAll` | — | O(capacity + n) |

All "O(1)" entries assume good hash dispersion (see the previous lessons) and exclude the cost of `hashCode`/`equals` and of the user function.

## 10. Incorrect Implementation

```java
// 1. Check-then-act: two lookups, and a race if the map is shared
if (!sessions.containsKey(id)) {
    sessions.put(id, createSession(id));
}

// 2. Using computeIfAbsent to build a recursive cache
Map<Integer, BigInteger> memo = new HashMap<>();
BigInteger fib(int n) {
    if (n < 2) return BigInteger.valueOf(n);
    return memo.computeIfAbsent(n, k -> fib(k - 1).add(fib(k - 2)));  // modifies memo inside f → CME
}

// 3. A function that returns null by accident deletes data
inventory.computeIfPresent(sku, (k, qty) -> adjustments.get(k));      // null when no adjustment → entry removed!
```

## 11. Correct Implementation

```java
// 1. One call; and atomic per key if `sessions` is a ConcurrentHashMap
Session s = sessions.computeIfAbsent(id, this::createSession);

// 2. Memoization without modifying the map inside the function
BigInteger fib(int n) {
    if (n < 2) return BigInteger.valueOf(n);
    BigInteger cached = memo.get(n);
    if (cached != null) return cached;
    BigInteger value = fib(n - 1).add(fib(n - 2));
    memo.put(n, value);
    return value;
}   // (for large n prefer an iterative loop: no recursion depth problem)

// 3. Make "no adjustment" explicit
inventory.computeIfPresent(sku, (k, qty) -> qty + adjustments.getOrDefault(k, 0));
```

## 12. Enterprise Use Case

**Aggregating a settlement file in one pass.** A payments service reads transactions and needs: totals per merchant, failed transaction IDs per merchant, and the first transaction seen per merchant.

```java
Map<String, BigDecimal> totals = new HashMap<>();
Map<String, List<String>> failures = new HashMap<>();
Map<String, Txn> first = new HashMap<>();

for (Txn t : transactions) {
    totals.merge(t.merchant(), t.amount(), BigDecimal::add);                 // sum
    if (t.failed()) failures.computeIfAbsent(t.merchant(), m -> new ArrayList<>()).add(t.id()); // multimap
    first.putIfAbsent(t.merchant(), t);                                       // keep first
}
```

Each map update is a single bucket search. For parallel processing, switch the maps to `ConcurrentHashMap` (whose `merge`/`computeIfAbsent` are atomic per key) — and make the per-merchant `List` thread-safe or collect per-thread results and combine them, because `computeIfAbsent(...).add(...)` adds to the list *outside* the atomic section.

## 13. Alternatives and Trade-offs

- **`getOrDefault`** for read-only defaults (does not store anything).
- **`Collectors.groupingBy` / `toMap(..., merge)`** for building maps from streams (Module 17) — same semantics underneath, declarative style.
- **`ConcurrentHashMap`** when updates come from several threads: the same methods, atomic per key; the mapping function must be short and must not touch other keys of the map.
- **`Map.Entry.setValue` during iteration** for bulk value updates; `replaceAll` for transforming every value.

## 14. Edge Cases

- **`null` values** make `get` ambiguous and are treated as absent by `putIfAbsent`/`computeIfAbsent`/`merge`; prefer not to store them.
- **`merge(k, null, f)`** throws `NullPointerException`; use `compute` if `null` must be handled.
- **A function returning `null`** removes the mapping in `computeIfPresent`/`compute`/`merge` — silent data loss if unintended.
- **Recursive or nested map modification inside a function** → `ConcurrentModificationException` (HashMap, best effort) — in `ConcurrentHashMap` it can deadlock or throw `IllegalStateException` ("Recursive update").
- **`put` of an equal key does not replace the key object**, only the value. If equal keys differ in other state, the originally inserted key object remains.
- **Iterating while another code path replaces values** is fine (not structural); adding or removing keys is not.

## 15. Interview Questions

**Q1. Walk through `HashMap.put()` for a key that is not present and whose bucket already holds one node.**

<details><summary>Answer</summary>

`hash()` spreads the key's `hashCode`; the table exists, so index `i = (n − 1) & hash`; `tab[i]` is non-null; the first node is compared (stored hash, then `==`, then `equals`) and does not match; it is not a `TreeNode`; the loop finds `p.next == null` and appends `newNode(...)` at the tail (binCount 0 < 7, no treeify); `e` is null, so `modCount++`, `++size` and, if `size > threshold`, `resize()`; `afterNodeInsertion` runs (eviction hook for `LinkedHashMap`); returns `null`.

</details>

**Q2. What is the difference between `putIfAbsent(k, new Expensive())` and `computeIfAbsent(k, x -> new Expensive())`?**

<details><summary>Answer</summary>

`putIfAbsent` evaluates its argument eagerly — the expensive object is created even if the key is present. `computeIfAbsent` calls the function only if the key is absent (or mapped to `null`) and returns the current value either way. Also, `putIfAbsent` returns the *previous* value (`null` when it inserted), while `computeIfAbsent` returns the value now in the map.

</details>

**Q3. What happens if a remapping function returns `null`?**

<details><summary>Answer</summary>

For `compute`, `computeIfPresent` and `merge`, the mapping is removed (or not created). For `computeIfAbsent`, nothing is stored and `null` is returned. This is specified by the `Map` interface.

</details>

**Q4. Why can `computeIfAbsent` throw `ConcurrentModificationException` in a single-threaded program?**

<details><summary>Answer</summary>

Because `HashMap` detects that the mapping function modified the map (e.g. a recursive memoization that inserts other keys). It compares `modCount` before and after calling the function. Modifying the map inside the function would invalidate the bucket position computed before the call.

</details>

**Q5. Is iteration order of a HashMap stable?**

<details><summary>Answer</summary>

No guarantee. In practice it is bucket order then chain order, which changes when the table resizes, when keys with different hashes are added, and potentially across JDK versions. Use `LinkedHashMap` for insertion order or `TreeMap` for sorted order.

</details>

## 16. Practice Exercise

Implement `Map<String, Integer> topLevelDomainCounts(List<String> emails)` that counts e-mails per top-level domain (`"a@b.example.com"` → `"com"`), ignores blank or malformed addresses, and is case-insensitive. Use a single update method per address. Then explain what changes if the method must run on a parallel stream.

<details><summary>Solution</summary>

```java
static Map<String, Integer> topLevelDomainCounts(List<String> emails) {
    Map<String, Integer> counts = new HashMap<>();
    for (String email : emails) {
        if (email == null) continue;
        int at = email.lastIndexOf('@');
        int dot = email.lastIndexOf('.');
        if (at <= 0 || dot <= at + 1 || dot == email.length() - 1) continue; // malformed
        String tld = email.substring(dot + 1).toLowerCase(Locale.ROOT);
        counts.merge(tld, 1, Integer::sum);
    }
    return counts;
}
```

On a parallel stream, a shared `HashMap` would race. Either collect with `Collectors.groupingByConcurrent(tld, Collectors.summingInt(e -> 1))`, use a `ConcurrentHashMap` with `merge` (atomic per key), or — usually best — use `Collectors.groupingBy(..., Collectors.counting())`, which builds per-thread maps and combines them.

</details>

## 17. Key Takeaways

- `put`: hash → index → empty bucket / match first node / tree / walk chain and append → `modCount`, `size`, resize if `size > threshold`.
- Replacing a value is not a structural modification; adding or removing a key is.
- `computeIfAbsent`, `computeIfPresent`, `compute`, `merge`, `putIfAbsent` each locate the bucket once; know their absent/`null` rules.
- A `null` function result removes; the function must never modify the map.
- Iteration is O(capacity + n), fail-fast, and in no specified order.

## 18. Official References

- [`java.util.Map` — `compute`, `computeIfAbsent`, `computeIfPresent`, `merge`, `putIfAbsent` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html)
- [`java.util.HashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html) — ConcurrentModificationException from mapping functions.
- [`java.util.concurrent.ConcurrentHashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [OpenJDK 25 source: `HashMap.java` (`putVal`, `getNode`, `removeNode`, `HashIterator`)](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/HashMap.java)
