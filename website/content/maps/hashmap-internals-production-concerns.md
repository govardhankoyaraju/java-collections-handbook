## 1. Learning Objectives

This lesson completes the 29-point deep dive with points **25–29**: mutable key problems, memory overhead, average and worst-case complexity, thread-safety limitations, and implementation changes across JDK versions.

After this lesson you will be able to:

```objectives
```

## 2. The Problem

`HashMap` rarely fails in development. It fails in production, in ways that look like data corruption:

- an entry that is "in the map" (it shows up when you print the map) but `get` returns `null` and `remove` does nothing;
- a cache that grows without bound because "the same" key is inserted again and again;
- counters that are slightly wrong under load, or — on old JDKs — a request thread spinning at 100% CPU forever inside `HashMap.get`;
- a heap dump in which `HashMap$Node` is the largest class by instance count.

Each has a precise cause rooted in the internals from the previous three lessons. This lesson connects those internals to production behaviour.

## 3. Beginner-Friendly Explanation

- **Mutable keys:** the cloakroom attendant chose the hook from your ticket's number. If you secretly change the number on your ticket afterwards, the attendant now looks on the wrong hook. Your coat is still hanging on the old hook — nobody can find it, and it cannot be handed back.
- **Memory:** every coat needs a hanger (a node object) and a hook slot (a table entry). For small items, the hangers can weigh more than the items.
- **Thread safety:** if two attendants rearrange the same hooks at the same time without talking to each other, coats get dropped. `HashMap` assumes there is only one attendant at a time.

## 4. Detailed Technical Explanation

### Point 25 — Mutable key problems

`HashMap` stores the **spread hash** in `Node.hash` at insertion time and chooses the bucket from it. If the key's `hashCode()` later changes (because a field used by `hashCode`/`equals` changed):

1. `get(sameKeyObject)` computes the *new* hash, probably goes to a different bucket, and returns `null`.
2. Even if the new hash happens to map to the same bucket, the stored `Node.hash` (old) differs from the new hash, so the node is skipped without calling `equals`.
3. `get(new Key(oldValues))` finds the right bucket and matching stored hash, but `equals` now fails because the stored key object has new values.
4. The entry is still in the table: `size()` counts it and iteration shows it. Only iteration-based removal (`entrySet().removeIf`, `Iterator.remove`) can delete it.

The same applies to `HashSet` (the object can be added twice) and to `TreeMap`/`TreeSet` if fields used by `compareTo` change (the tree's ordering invariant breaks).

> [!CONTRACT]
> The `Map` Javadoc: "Great care must be exercised if mutable objects are used as map keys. The behavior of a map is not specified if the value of an object is changed in a manner that affects equals comparisons while the object is a key in the map."

### Point 26 — Memory overhead

> [!IMPL]
> Under the 64-bit HotSpot model used throughout this handbook (JDK 25, compressed oops, 12-byte headers, 8-byte alignment):
> - `HashMap.Node`: header 12 + `int hash` 4 + `key`, `value`, `next` 3 × 4 = 28 → **32 bytes**
> - `HashMap.TreeNode` (extends `LinkedHashMap.Entry`, which extends `Node`): adds `before`, `after`, `parent`, `left`, `right`, `prev` (6 × 4) and `boolean red` → 53 → **56 bytes**
> - table: 16-byte array header + **4 bytes per bucket**
> - plus the `HashMap` object itself (~48 bytes) and lazily created view objects.
>
> With `-XX:+UseCompactObjectHeaders` (JEP 519, JDK 25) headers shrink to 8 bytes and a `Node` to 24 bytes.

Per entry, *excluding* keys and values: 32 bytes for the node plus 4 / (fill ratio) bytes of table — about **37–43 bytes**, depending on where the size falls between resizes. Keys and values are additional objects: a `Long` key is 24 bytes; a short `String` is 40+ bytes (the `String` object plus its `byte[]`).

### Point 27 — Average and worst-case complexity

| Situation | `get`/`put`/`remove` |
|---|---|
| Well-distributed hash codes, load factor ≤ 0.75 | **O(1) expected** (amortized for `put` because of resizes) |
| Chain in a plain bin | O(k) for k nodes in the bin; in a table of ≥ 64 buckets a plain chain is converted to a tree once it reaches 9 nodes |
| Tree bin, keys with distinct hashes or mutually `Comparable` | O(log k) |
| Tree bin, non-comparable keys with *identical* hashes | up to O(k) |
| All n keys in one bin, comparable | O(log n) worst case |
| All n keys in one bin, non-comparable, identical hash | O(n) worst case |
| Single `put` that triggers a resize | O(capacity + n) |
| Iteration, `containsValue` | O(capacity + n) |

So "HashMap is O(1)" means **expected O(1) given good hash codes**. The worst case is O(log n) or O(n) depending on the key type.

### Point 28 — Thread-safety limitations

`HashMap` has no synchronization and no `volatile` fields. The Javadoc requires external synchronization if multiple threads access a map concurrently and at least one modifies it structurally. Without it:

- **Lost updates:** two threads `merge` the same key; both read the old value; one write wins (demonstrated below).
- **Lost entries / corrupted structure:** two threads append to the same chain or resize concurrently; nodes can be dropped. Concurrent treeification and resizing can leave bins in inconsistent states that later throw unexpected exceptions.
- **Visibility:** a thread may not see entries put by another thread at all, or may see a node whose fields are not yet visible.
- **Fail-fast is not protection:** `ConcurrentModificationException` is best-effort and may not be thrown.

Safe options: confine the map to one thread; build it fully and then publish it safely (e.g. `Map.copyOf` into a `final` field, or a `volatile` reference); or use `ConcurrentHashMap`, whose `merge`/`compute` are atomic per key. `Collections.synchronizedMap` serializes individual calls but compound sequences (check-then-act, iteration) still need explicit `synchronized (map)` blocks.

### Point 29 — Implementation changes across JDK versions

| Release | Change relevant to HashMap |
|---|---|
| 1.0 | `Hashtable` (synchronized, no nulls) |
| 1.2 | `HashMap` introduced with the Collections Framework: unsynchronized, allows a null key and null values |
| 1.4 | `LinkedHashMap` and `IdentityHashMap` added |
| 5 | Generics; `ConcurrentHashMap` added in `java.util.concurrent` |
| 7 and earlier | Chains with **head insertion**; a multi-shift supplemental hash function. Concurrent (unsafe) resizes on these versions were widely reported to be able to create a cycle in a chain, making `get` loop forever. 7u6 added an optional alternative hashing for `String` keys (`jdk.map.althashing.threshold`). |
| **8** | **JEP 180: tree bins** for heavily collided buckets; simplified spreading `h ^ (h >>> 16)`; tail insertion; order-preserving lo/hi split on resize; alternative String hashing removed; default methods `compute*`, `merge`, `putIfAbsent`, `getOrDefault`, `forEach`, `replaceAll` added to `Map` and optimised in `HashMap` |
| 9 | `Map.of`/`Map.ofEntries` (separate immutable classes with randomized iteration order); `HashMap.compute*`/`merge` document and detect modification by the mapping function (`ConcurrentModificationException`) |
| 10 | `Map.copyOf` |
| 19 | `HashMap.newHashMap(int)` (and `LinkedHashMap.newLinkedHashMap`, `HashSet.newHashSet`, …) |
| 21 | Sequenced collections: `LinkedHashMap` implements `SequencedMap`; `HashMap` does not |
| 25 | The JDK 8 bucket/tree design is unchanged in the JDK 25 source; JEP 519 compact object headers (opt-in) reduce node size |

Only the API (and its documented behaviour) is a contract. Spreading, thresholds, insertion order within a bucket and node layout have changed before and can change again.

## 5. Internal Implementation

Why the mutated key is unreachable, in terms of `getNode`:

```java title="OpenJDK 25 · HashMap.getNode (abridged)"
if ((tab = table) != null && (n = tab.length) > 0 &&
    (first = tab[(n - 1) & (hash = hash(key))]) != null) {   // NEW hash → probably another bucket
    if (first.hash == hash &&                                 // stored OLD hash ≠ NEW hash
        ((k = first.key) == key || (key != null && key.equals(k))))
        return first;
    ...
}
return null;
```

And why lost updates happen with `merge` on a plain `HashMap`: `merge` reads the node's value, calls the remapping function, then writes `old.value = v`. Between the read and the write of one thread, another thread can do the same; there is no lock or compare-and-set. `ConcurrentHashMap.merge` performs the same steps while holding a lock on the bin (or with CAS for empty bins).

## 6. Memory Representation

```text
One HashMap<Long, String> entry (HotSpot model, compressed oops):

table slot   4 B ──► Node 32 B ──► key   Long 24 B
                      │            value String 24 B ──► byte[] 16 + length B
                      └─ next ──► (another Node in the bucket, or null)

≈ 37–43 B for table + Node, ≈ 24 B key, ≈ 40+ B value  →  ~100 B per entry for small values.
A 10-million-entry map of this shape is on the order of 1 GB.
```

## 7. Runnable Java Example

```example
m07/MutableKeyDemo
m07/HashMapMemoryModel
m07/ConcurrentCountingDemo
```

The last example is **nondeterministic**, so no expected output is shown: the `ConcurrentHashMap` total is always 200,000; the plain `HashMap` total differs from run to run and is usually lower (lost updates). On one run while preparing this lesson it printed 199,379 — your numbers will differ, and occasionally the racy total may even be correct by luck, which does not make the code correct.

## 8. Execution Walkthrough

**`MutableKeyDemo`**

1. `MutableSku("SKU-1")` is inserted with value 10; its node stores the hash of `"SKU-1"`.
2. `setCode("SKU-1-RENAMED")` changes `hashCode()`. Lookups with the same instance and with a new `"SKU-1"` key both return `null`; `containsKey` is `false`.
3. `size()` is still 1 and printing the map shows `{SKU-1-RENAMED=10}`: the entry exists but is unreachable by key. `remove` cannot find it either.
4. With a `HashSet`, adding the same object, mutating it, and adding it again stores it **twice**: `size=2`.
5. With an immutable record key, "renaming" is an explicit `remove` + `put`, which keeps the map consistent.

**`HashMapMemoryModel`**

1. Node = 32 bytes, TreeNode = 56 bytes under the stated model.
2. 12 entries fit a 16-slot table (464 bytes incl. table, 38.7 B/entry); the 13th forces a 32-slot table (43.1 B/entry right after the resize).
3. At one million entries the table has 2,097,152 slots (threshold 1,572,864), and table + nodes cost about **40 bytes per entry**, *before* counting keys and values.

**`ConcurrentCountingDemo`**

1. Four threads each merge 50,000 events into 100 keys.
2. With `ConcurrentHashMap`, `merge` is atomic per key: the total is exactly 200,000.
3. With `HashMap`, concurrent read-modify-write sequences overwrite each other, so increments are lost (and structural corruption is possible while the 100 keys are first inserted).

## 9. Complexity Analysis

| Concern | Time | Space |
|---|---|---|
| Expected operations | O(1) | O(n) nodes + O(capacity) table |
| Worst case, comparable colliding keys | O(log n) | tree nodes ≈ 1.75× plain nodes |
| Worst case, non-comparable identical hashes | O(n) | same |
| Resize | O(capacity + n) per resize; O(1) amortized per put | transient: old + new table |
| Removing a mutated key | O(capacity + n) via iteration (`entrySet().removeIf`) | — |

## 10. Incorrect Implementation

```java
// 1. JPA entity with generated id used as a HashSet element BEFORE persisting
@Entity class OrderLine {
    @Id @GeneratedValue Long id;
    @Override public boolean equals(Object o) { return o instanceof OrderLine l && Objects.equals(id, l.id); }
    @Override public int hashCode() { return Objects.hashCode(id); }   // changes when id is assigned!
}
Set<OrderLine> lines = new HashSet<>();
lines.add(line);              // id == null → hash 0
entityManager.persist(line);  // id assigned → hash changes
lines.contains(line);         // false

// 2. Shared mutable HashMap as an application-wide cache
static final Map<String, Rate> RATES = new HashMap<>();   // read and written by request threads
```

## 11. Correct Implementation

```java
// 1. Entities: base equality on an immutable business key, or use a stable hashCode
@Entity class OrderLine {
    @Id @GeneratedValue Long id;
    @Column(nullable = false, updatable = false) UUID lineRef = UUID.randomUUID(); // assigned at creation
    @Override public boolean equals(Object o) { return o instanceof OrderLine l && lineRef.equals(l.lineRef); }
    @Override public int hashCode() { return lineRef.hashCode(); }
}

// 2. Concurrent cache with atomic per-key loading
private static final ConcurrentMap<String, Rate> RATES = new ConcurrentHashMap<>();
Rate rate(String currencyPair) {
    return RATES.computeIfAbsent(currencyPair, this::loadRate);   // loadRate must be quick and must not touch RATES
}
```

For reference data that is loaded once and only read afterwards, building a `HashMap` and publishing `Map.copyOf(map)` through a `final` or `volatile` field is simpler and avoids concurrency costs on reads.

## 12. Enterprise Use Case

**Diagnosing a memory incident.** A service's heap histogram (`jcmd <pid> GC.class_histogram`) shows 40 million `java.util.HashMap$Node`, 40 million `java.lang.Long` and a single huge `HashMap$Node[]`. Reasoning with this lesson's model: ~32 B (node) + ~4–8 B (table) + 24 B (`Long` key) + the value per entry — around 2.5–3 GB before values. Options, in order of preference:

1. **Do you need all of it in memory?** Move the lookup to the database or a dedicated cache with eviction.
2. **Change representation:** if keys are dense `long` IDs, a sorted `long[]` with `Arrays.binarySearch` (or a primitive-keyed map from a specialised library) removes both the node and the boxed key.
3. **Bound it:** a `LinkedHashMap`-based LRU (next lesson) or a caching library with size-based eviction.
4. **Pre-size** to avoid the transient double table during resizes.

**Code review rule set** that follows from points 25–28: keys must be immutable (records, `String`, enums, boxed primitives); no `HashMap` field shared across threads without a documented safety argument; caches must have a size bound; maps loaded once are published as immutable copies.

## 13. Alternatives and Trade-offs

| Need | Alternative | Trade-off |
|---|---|---|
| Concurrent updates | `ConcurrentHashMap` | slightly more overhead per op; no null keys/values; weakly consistent iteration |
| Bounded cache | `LinkedHashMap` LRU / caching library | eviction policy, stats, expiry |
| Ordering + guaranteed O(log n) | `TreeMap` | slower average lookups; ~40-byte entries |
| Dense enum keys | `EnumMap` | array-backed, very compact |
| Read-only after load | `Map.copyOf` | exactly sized, immutable, thread-safe to share once published |
| Huge primitive-keyed data | sorted primitive arrays / specialised libraries | no boxing; less convenient API |

## 14. Edge Cases

- **Restoring a mutated key's old state** makes the entry reachable again (tested in `mutatedKeyBecomesUnreachable`) — evidence that the node never moved.
- **Keys mutated in a way that does not affect `equals`/`hashCode`** are harmless.
- **`IdentityHashMap`** is immune to mutable keys (it uses identity) — but has identity semantics.
- **Arrays as keys** use identity `hashCode`/`equals`; `map.get(new int[]{1})` never finds `new int[]{1}`.
- **`hashCode` caching in mutable classes** (like `String`'s cache) is only safe for immutable classes.
- **Concurrent read-only access** to a fully built, safely published `HashMap` is safe; any concurrent writer makes all access unsafe.

## 15. Interview Questions

**Q1. What happens if a Map key changes after insertion?**

<details><summary>Answer</summary>

If the change affects `hashCode`/`equals`, the entry becomes unreachable: lookups compute a different hash (wrong bucket, or a mismatch with the stored `Node.hash`), and lookups with an "old-value" key fail `equals`. The entry still counts in `size()` and appears in iteration; only iteration-based removal can delete it. The `Map` contract says behaviour is unspecified. Use immutable keys.

</details>

**Q2. Is HashMap thread-safe for concurrent reads?**

<details><summary>Answer</summary>

Only if no thread modifies it after it has been safely published (e.g. assigned to a `final` field during construction or via a `volatile` write after it was fully built). Any concurrent structural modification makes even reads unsafe — they can miss entries or observe inconsistent state. For concurrent writers use `ConcurrentHashMap`.

</details>

**Q3. Why could a HashMap cause an infinite loop on old JDKs?**

<details><summary>Answer</summary>

In JDK 7 and earlier, resize moved nodes with head insertion, reversing chain order. Two threads resizing the same (unsynchronized) map concurrently could each relink nodes so that a chain formed a cycle; a later `get` on that bucket looped forever. JDK 8's order-preserving lo/hi split changed the mechanics, but concurrent use of `HashMap` is still unsafe and can lose data.

</details>

**Q4. How much memory does a `HashMap<Long, Long>` with 1 million entries use?**

<details><summary>Answer</summary>

Under the HotSpot model: ~40 B per entry for table + node (from `HashMapMemoryModel`), plus 24 B for each `Long` key and 24 B for each `Long` value (unless values are small cached ones) — roughly 85–90 MB. Measure with a heap histogram or JOL for your JVM.

</details>

**Q5. What is HashMap's worst-case lookup complexity in Java 25?**

<details><summary>Answer</summary>

O(log n) when the colliding keys have distinct hashes or are mutually `Comparable` (tree bins), O(n) when many non-comparable keys share an identical hash. Expected O(1) with good hashing. These bounds rely on OpenJDK implementation details since JDK 8.

</details>

## 16. Practice Exercise

A colleague's `Map<Customer, BigDecimal> creditLimits` uses a `Customer` class with a mutable `email` field included in `equals`/`hashCode`. Customers can change their e-mail. Write (a) a method that repairs an existing map in which some keys may already be mutated, and (b) the design change that prevents the problem.

<details><summary>Solution</summary>

(a) Rebuild the map from its entries; iteration still reaches every node, and re-inserting computes fresh hashes:

```java
static <K, V> Map<K, V> rehash(Map<K, V> broken) {
    Map<K, V> repaired = HashMap.newHashMap(broken.size());   // Java 19+
    for (Map.Entry<K, V> e : broken.entrySet()) {
        V previous = repaired.putIfAbsent(e.getKey(), e.getValue());
        if (previous != null) {
            throw new IllegalStateException("Two entries now have equal keys: " + e.getKey());
        }
    }
    return repaired;
}
```

Mutation may have made two keys equal, so the method detects collisions instead of silently dropping one.

(b) Key the map by an immutable identifier — `Map<CustomerId, BigDecimal>` with `record CustomerId(UUID value)` — and keep mutable attributes such as e-mail out of key equality.

</details>

## 17. Key Takeaways

- **Never mutate a key's equality-relevant state** while it is in a hash-based (or tree-based) collection: the entry becomes unreachable.
- A `HashMap` entry costs ~40 bytes of map structure (HotSpot model) plus its key and value objects.
- O(1) is *expected*; worst case is O(log n) with comparable colliding keys, O(n) otherwise.
- `HashMap` is not thread-safe; use confinement, safe publication of immutable copies, or `ConcurrentHashMap`.
- The JDK 8 redesign (tree bins, new spreading, tail insertion) is still the JDK 25 implementation; none of it is contractual.

## 18. Official References

- [`java.util.Map` — mutable keys (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html)
- [`java.util.HashMap` — synchronization requirements (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html)
- [`java.util.concurrent.ConcurrentHashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [JEP 180: Handle Frequent HashMap Collisions with Balanced Trees](https://openjdk.org/jeps/180)
- [JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)
- [JLS Chapter 17: Threads and Locks (Java SE 25)](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html)
