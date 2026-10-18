## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Most collection-related performance defects in business code are not exotic. They are an O(n) operation placed inside a loop over n items:

- enriching each order by scanning a list of customers,
- checking `list.contains` for every incoming record,
- calling `LinkedList.get(i)` in an indexed `for` loop,
- removing from the front of an `ArrayList` used as a queue.

Each is invisible at test-data sizes and catastrophic at production sizes. Fixing them requires knowing, for every common structure, **what each operation costs and why** — and then reshaping the algorithm so that expensive operations happen once instead of n times.

## 3. Beginner-Friendly Explanation

Every collection is built from one (or a mix) of four physical shapes:

1. **Array** — numbered slots side by side. Jump to slot `i` instantly; inserting in the middle means shifting everything after it.
2. **Linked nodes** — each element points to the next. Inserting next to a node you already hold is instant; *finding* position `i` means walking there.
3. **Hash table** — an array of buckets; a key's hash code says which bucket to look in. Finding a key is instant on average, but there is no order.
4. **Balanced tree** — elements sorted in a tree that is kept short. Each step down the tree halves the candidates, so finding, inserting and removing take about `log₂ n` steps — and you get sorted order for free.

Knowing the shape tells you the costs. Knowing the costs tells you which shape your problem needs.

## 4. Detailed Technical Explanation

### Costs by underlying structure

| Operation | Array (`ArrayList`) | Linked (`LinkedList`) | Hash (`HashMap`/`HashSet`) | Balanced tree (`TreeMap`/`TreeSet`) |
|---|---|---|---|---|
| Access by position | O(1) | O(n) | — | — |
| Find by value/key | O(n) | O(n) | O(1) expected | O(log n) |
| Insert at end | O(1) amortized | O(1) | O(1) expected (amortized over resizes) | O(log n) |
| Insert/remove at front or middle | O(n) shift | O(1) once positioned, O(n) to get there | — | O(log n) |
| Min / max / floor / ceiling | O(n) unless sorted | O(n) | O(n) | O(log n) |
| Iterate all | O(n) | O(n) | O(capacity + n) | O(n), sorted |

The [complexity reference](/reference/complexity) lists the same information per JDK class, marking which entries the Javadoc documents.

### Why a balanced tree is O(log n)

A binary search tree compares the key with a node and goes left or right. If the tree is *balanced*, its height is O(log n), so every search, insert and delete touches O(log n) nodes. `TreeMap` is a **red-black tree**: colouring rules guarantee that the longest root-to-leaf path is at most twice the shortest, giving a height of at most `2 · log₂(n + 1)`. Rebalancing after an insert or delete takes a bounded number of rotations plus O(log n) recolourings.

> [!CONTRACT]
> `TreeMap`'s Javadoc guarantees log(n) time for `containsKey`, `get`, `put` and `remove`. That is a stronger promise than `HashMap`'s, whose constant time is conditional on good hash dispersion.

### Why a hash table is O(1) expected

A hash table computes `bucket = f(hashCode(key))` in constant time, then compares the key only with the few entries in that bucket. Keeping the number of entries per bucket bounded (by resizing when a *load factor* is exceeded) keeps the expected bucket size constant. The four [HashMap internals lessons](/learn/maps/hashmap-internals-hashing-and-indexing) take this apart in detail.

### Iteration: O(capacity + n) for hash tables

A `HashMap` iterator walks the whole bucket array, including empty buckets. A map that once held a million entries and now holds ten still iterates a large table, because the table never shrinks. `LinkedHashMap` iterates its linked list instead, so its iteration cost is proportional to the size alone.

### Turning O(n · m) into O(n + m)

The most valuable pattern in this lesson: if you need to look something up repeatedly, **build an index once**.

```java
Map<Long, Customer> byId = new HashMap<>();             // O(n) to build
for (Customer c : customers) byId.put(c.id(), c);
for (Order o : orders) process(o, byId.get(o.customerId())); // O(1) expected per lookup
```

Total: O(n + m) expected time, O(n) extra space — versus O(n · m) for scanning.

## 5. Internal Implementation

How each structure realises its costs (details in later modules):

- **`ArrayList.get(i)`** checks the bound with `Objects.checkIndex(i, size)` and returns `elementData[i]` — one array read.
- **`ArrayList.add(0, e)`** calls `System.arraycopy(elementData, 0, elementData, 1, size)` — moving every element.
- **`LinkedList.get(i)`** walks from the head if `i < size / 2`, otherwise from the tail — up to n/2 hops.
- **`HashMap.get(k)`** computes `h ^ (h >>> 16)` of `k.hashCode()`, indexes `table[(n − 1) & hash]`, then compares the few keys in that bucket.
- **`TreeMap.get(k)`** starts at the root and follows `left`/`right` according to `compareTo` or the comparator until it finds the key or reaches `null`.

## 6. Memory Representation

```text
Hash table (capacity 8)                    Red-black tree (TreeMap)
index: 0    1    2    3    4    5    6    7          (40)
      [ ]  [●]  [ ]  [●]  [ ]  [ ]  [●]  [ ]         /    \
            │         │              │            (20)    (60)
          k=17      k=3→k=11       k=6            /  \    /  \
                    (collision chain)          (10)(30)(50)(70)
O(1) expected: compute index, scan a short chain    O(log n): ≤ 2·log₂(n+1) levels
```

Trees store three references per node (left, right, parent) plus the key, value and colour; hash tables store a bucket array plus one node per entry. Both are "node-based" and pay per-element object overhead, unlike `ArrayList`.

## 7. Runnable Java Example

```example
m02/LookupIndexing
```

## 8. Execution Walkthrough

1. For each size `n`, the program creates `n` customers and `n` orders whose customer IDs are a permutation of the customer IDs.
2. `enrichByScanning` scans the customer list for every order, stopping at the match. Because each customer is matched exactly once, the comparisons are `1 + 2 + … + n = n(n + 1)/2`: 5,050 for 100, 500,500 for 1,000 and 50,005,000 for 10,000.
3. `enrichWithIndex` puts each customer into a `HashMap` (n operations), then performs one `get` per order (n operations): 200, 2,000 and 20,000 operations.
4. `putIfAbsent` returns the existing value when an ID is already present, which lets the index **detect duplicate customer IDs** instead of silently overwriting one — a data-quality check you get for free.
5. The program asserts both strategies produce equal results, so the speed-up does not change behaviour.

## 9. Complexity Analysis

| Strategy | Time | Extra space | Behaviour on duplicates |
|---|---|---|---|
| Nested scan | O(n · m) | O(1) | First match wins silently |
| `HashMap` index | O(n + m) expected | O(n) | Detectable with `putIfAbsent` |
| `TreeMap` index | O((n + m) log n) | O(n) | Detectable; supports range queries |
| Sort both + merge-join | O(n log n + m log m) | O(n + m) for sorting copies | Detectable; good when inputs are already sorted |

## 10. Incorrect Implementation

Using an `ArrayList` as a FIFO queue in a batch dispatcher:

```java
List<Job> pending = new ArrayList<>(jobs);
while (!pending.isEmpty()) {
    Job next = pending.remove(0);   // shifts every remaining element: O(n)
    dispatch(next);
}
```

Processing n jobs costs about n²/2 element moves. A second example: a `Set` that is actually a `List`.

```java
List<String> blockedEmails = loadBlocklist();  // 500,000 entries
users.stream().filter(u -> !blockedEmails.contains(u.email())) ... // O(users × 500,000)
```

## 11. Correct Implementation

```java
Deque<Job> pending = new ArrayDeque<>(jobs);
while (!pending.isEmpty()) {
    dispatch(pending.pollFirst());   // O(1)
}
```

```java
Set<String> blockedEmails = new HashSet<>(loadBlocklist()); // build once: O(b)
users.stream().filter(u -> !blockedEmails.contains(u.email())) ... // O(1) expected per user
```

Both fixes keep the code equally readable; they only change the *shape* the data lives in.

## 12. Enterprise Use Case

A monthly reconciliation compares 2 million ledger entries with 2 million bank-statement lines by `transactionReference`.

- **Nested scan:** up to 4 × 10¹² comparisons — not feasible.
- **Index:** build a `HashMap<String, StatementLine>` from the statement (2 million `put`s), then probe it once per ledger entry. Expected O(n + m). Use `putIfAbsent` or `merge` to detect duplicate references while building.
- **Ordering needs:** if the report must list unmatched items in reference order, either index with a `TreeMap` (O(log n) per operation, sorted iteration) or keep the `HashMap` and sort only the unmatched subset at the end — usually cheaper when most items match.
- **Memory:** 2 million entries in a `HashMap` is hundreds of megabytes; if the heap is constrained, sort both files externally (or in the database) and merge-join them in one streaming pass with O(1) memory.

## 13. Alternatives and Trade-offs

- **`HashMap` vs `TreeMap`:** O(1) expected vs O(log n) guaranteed; unordered vs sorted with navigation (`floorKey`, `subMap`). Choose `TreeMap` when you need order or range queries, `HashMap` otherwise.
- **`HashMap` vs sorted array + binary search:** the array is far more compact and cache-friendly, but static; inserting is O(n).
- **Database indexes:** when the data already lives in a database, a join with proper indexes may beat loading everything into the JVM.
- **`EnumMap`/`EnumSet`:** for enum keys, array-indexed by ordinal — O(1) without hashing.

## 14. Edge Cases

- **Duplicate keys while indexing:** `put` silently replaces; decide explicitly (reject, keep first, keep last, collect into a list).
- **Missing keys:** `HashMap.get` returns `null` both for absent keys and keys mapped to `null`; use `containsKey` or avoid `null` values.
- **Mutable keys:** changing a field used by `hashCode` or `compareTo` after insertion makes the entry unreachable (demonstrated in [HashMap Internals IV](/learn/maps/hashmap-internals-production-concerns)).
- **Comparator inconsistent with equals:** a `TreeMap` treats keys that compare as 0 as the *same* key, even if `equals` says otherwise.
- **Iteration of a shrunken `HashMap`:** cost depends on capacity, not size; copy into a new map if you shrink drastically and iterate often.

## 15. Interview Questions

**Q1. You must match 1 million orders to 100,000 customers. Describe two O(n + m)-ish approaches and their trade-offs.**

<details><summary>Answer</summary>

(1) Index customers in a `HashMap` by ID — O(n + m) expected, O(customers) memory. (2) Sort both by customer ID and merge-join — O(n log n + m log m), or O(n + m) if already sorted (e.g. ordered database cursors), with streaming memory. The hash approach is simplest in memory; the merge-join scales beyond the heap. *Follow-up:* duplicate IDs — detect with `putIfAbsent` or by grouping.

</details>

**Q2. Why is `TreeMap.get` O(log n) in the worst case while `HashMap.get` is only O(1) on average?**

<details><summary>Answer</summary>

`TreeMap` is a red-black tree whose height is bounded by about 2·log₂(n + 1) regardless of the keys; every lookup follows one root-to-leaf path. `HashMap`'s cost depends on how keys distribute over buckets, which depends on `hashCode` quality and input; degenerate keys can pile into one bucket.

</details>

**Q3. What is the cost of iterating a `HashMap` that held 10 million entries and now holds 10?**

<details><summary>Answer</summary>

Proportional to its capacity (still about 16 million buckets, since the table never shrinks) plus its size. Copying the remaining entries into a new `HashMap` restores small-table iteration; `LinkedHashMap` iteration is proportional to size only.

</details>

**Q4. Which `List` operations make `ArrayList` unsuitable as a queue, and what should be used?**

<details><summary>Answer</summary>

`remove(0)` and `add(0, e)` shift all elements: O(n). `ArrayDeque` provides O(1) `offerLast`/`pollFirst` (amortized for insertion) with array-backed locality. `LinkedList` also offers O(1) ends but with per-node allocation.

</details>

## 16. Practice Exercise

Each `Shipment` has a `warehouseCode`. You have 300,000 shipments and a list of 2,000 `Warehouse` objects. Produce, for each warehouse **in ascending `warehouseCode` order**, the number of shipments, including warehouses with zero shipments. Shipments whose code matches no warehouse must be reported separately. Aim for O(s + w log w).

<details><summary>Solution</summary>

```java
record Shipment(String id, String warehouseCode) {}
record Warehouse(String code, String name) {}

static Map<String, Long> countByWarehouse(List<Shipment> shipments, List<Warehouse> warehouses,
                                          List<Shipment> unmatched) {
    Map<String, Long> counts = new TreeMap<>();               // sorted output: O(w log w) to fill
    for (Warehouse w : warehouses) counts.put(w.code(), 0L);  // zero-count warehouses included
    for (Shipment s : shipments) {                            // O(s log w) with TreeMap...
        Long current = counts.get(s.warehouseCode());
        if (current == null) unmatched.add(s);
        else counts.put(s.warehouseCode(), current + 1);
    }
    return counts;
}
```

That is O(s log w + w log w). To reach O(s + w log w), count into a `HashMap` (O(1) expected per shipment) and copy into a `TreeMap` at the end (O(w log w)):

```java
Map<String, Long> counts = HashMap.newHashMap(warehouses.size()); // Java 19+
for (Warehouse w : warehouses) counts.put(w.code(), 0L);
for (Shipment s : shipments) {
    if (counts.computeIfPresent(s.warehouseCode(), (k, n) -> n + 1) == null) unmatched.add(s);
}
return new TreeMap<>(counts);
```

`computeIfPresent` returns `null` when the key is absent, which doubles as the "unmatched" test.

</details>

## 17. Key Takeaways

- Know the four shapes — array, linked, hash, balanced tree — and their costs.
- The most common defect is **an O(n) operation inside a loop**; the most common fix is **an index built once**.
- `TreeMap` gives guaranteed O(log n) and order; `HashMap` gives expected O(1) and no order.
- Hash-table iteration costs O(capacity + n); tables never shrink.
- Decide duplicate-key behaviour explicitly when you build an index.

## 18. Official References

- [`java.util.HashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html)
- [`java.util.TreeMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/TreeMap.html)
- [`java.util.LinkedHashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedHashMap.html) — iteration proportional to size.
- [`java.util.ArrayDeque` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayDeque.html)
- [OpenJDK 25 source: `TreeMap.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/TreeMap.java)
