## 1. Learning Objectives

This lesson covers deep-dive points **7–15**: collision handling, collision chains, treeification, tree bins, load factor, capacity, resize threshold, table resizing and entry redistribution.

After this lesson you will be able to:

```objectives
```

## 2. The Problem

A hash table with a fixed number of buckets degrades as it fills: with 16 buckets and 16,000 keys, each bucket holds about 1,000 keys and every lookup scans a long chain. And even a perfectly sized table can be attacked: if many keys share one hash code — by accident (a poor `hashCode`) or by design (a denial-of-service attack sending colliding strings) — they pile into one bucket.

`HashMap` addresses the first problem by **resizing** (doubling the table when it gets too full) and the second by **treeification** (turning an overpopulated bucket into a balanced tree). Both mechanisms have costs and quirks that matter in production: resize pauses on large maps, wasted memory from wrong initial capacities, and the subtle condition under which tree bins actually help.

## 3. Beginner-Friendly Explanation

Back to the cloakroom with 16 hooks:

- When several coats share a hook, they hang in a **chain**. Finding yours means checking down the chain.
- The attendant follows a rule: when the room holds more than **¾ as many coats as hooks** (12 coats on 16 hooks), they open a room with **twice as many hooks** (32) and re-hang every coat. That ratio is the **load factor**, and 12 is the **threshold**.
- If one hook ever gets more than 8 coats while the room is big enough (64+ hooks), the attendant replaces that hook's chain with a **sorted rack** (a tree), so finding a coat takes a few comparisons instead of walking the whole chain. If the room is still small, they simply open a bigger room instead.

## 4. Detailed Technical Explanation

### Points 7–8 — Collisions and collision chains

Two keys collide when they map to the same bucket: either their spread hashes are equal, or they differ only in bits above the mask. `HashMap` uses **separate chaining**: each bucket holds a singly linked list of `Node`s via `Node.next`.

> [!IMPL]
> Since JDK 8, `put` appends a new node at the **tail** of the chain (it must walk the chain anyway to check for an existing equal key). JDK 7 inserted at the head. Note that `computeIfAbsent`, `compute` and `merge` in JDK 25 insert a *new* node at the **head** of a plain bin — verified by `putAppendsToTheTailButComputeIfAbsentInsertsAtTheHead` in the examples' tests. Chain order is never part of the contract.

### Points 9–10 — Treeification and tree bins

```java title="OpenJDK 25 · HashMap constants"
static final int TREEIFY_THRESHOLD = 8;
static final int UNTREEIFY_THRESHOLD = 6;
static final int MIN_TREEIFY_CAPACITY = 64;
```

When `put` appends to a chain that already holds `TREEIFY_THRESHOLD` (8) nodes — so the chain reaches 9 — it calls `treeifyBin`:

- if the table has **fewer than 64** buckets, it **resizes instead** (a small table with a long chain is more likely to be under-sized than attacked);
- otherwise it converts the chain into a bin of `TreeNode`s forming a **red-black tree**.

A tree bin is ordered primarily by hash; for equal hashes, by `compareTo` if both keys are of the same class `C implements Comparable<C>`; otherwise by a tie-break on class name and identity hash code. Lookups for distinct hashes or comparable keys take O(log k) for a bin of k nodes.

> [!IMPL]
> The JDK source comment explains the thresholds: with random hash codes and load factor 0.75, bucket sizes follow approximately a Poisson distribution with mean about 0.5, so the expected frequency of a bucket holding 8 nodes is about 0.00000006 — "more: less than 1 in ten million". Tree bins should therefore only appear with poorly distributed or colliding hash codes. `TreeNode`s are roughly twice the size of plain nodes. A tree bin is converted back to a list when it shrinks: on resize, when a split half has ≤ 6 nodes; on removal, when the tree becomes structurally small.

> [!WARNING]
> Tree bins only bound lookups to O(log k) when colliding keys are **mutually comparable** (or have distinct full hashes). For non-comparable keys with *identical* hashes, a tree lookup may have to search both subtrees — potentially all k nodes. Tree bins still work correctly (tested in `treeBinsWorkEvenForNonComparableCollidingKeys`), they just do not help performance much.

### Points 11–13 — Load factor, capacity and threshold

- **Capacity**: the table length, always a power of two (default 16, maximum 2³⁰).
- **Load factor**: the maximum ratio of size to capacity before resizing (default **0.75**).
- **Threshold**: `(int)(capacity × loadFactor)` — 12 for 16 buckets. After `put` increments `size`, if `size > threshold`, the table is resized.

> [!CONTRACT]
> The `HashMap` Javadoc: "As a general rule, the default load factor (.75) offers a good tradeoff between time and space costs. Higher values decrease the space overhead but increase the lookup cost." It also advises setting a sufficient initial capacity when many mappings are expected, and points to `HashMap.newHashMap(int)` (Java 19+) for creating a map sized for an expected number of mappings.

Initial capacity is easy to get wrong:

| Construction | Table after first put | Threshold | Holds without resize |
|---|---|---|---|
| `new HashMap<>()` | 16 | 12 | 12 |
| `new HashMap<>(100)` | 128 (rounded up by `tableSizeFor`) | 96 | **96 — not 100** |
| `HashMap.newHashMap(100)` | `ceil(100 / 0.75) = 134` → 256 | 192 | 192 |
| `new HashMap<>(0)` | 1, immediately resized to 2 | 1 | — |

The constructor argument is a **table size hint**, not an expected number of entries. Before Java 19, the idiom was `new HashMap<>((int) Math.ceil(expected / 0.75))`.

### Points 14–15 — Table resizing and entry redistribution

`resize()` doubles the capacity and the threshold, allocates a new table, and moves every node. Because capacity is a power of two and doubles, each node's new index is either its **old index `j`** or **`j + oldCap`** — decided by one bit of its stored hash:

```java title="OpenJDK 25 · HashMap.resize() — splitting one bucket (excerpt)"
do {
    next = e.next;
    if ((e.hash & oldCap) == 0) {   // the newly significant bit is 0 → "lo" list, stays at j
        if (loTail == null) loHead = e; else loTail.next = e;
        loTail = e;
    } else {                        // the bit is 1 → "hi" list, moves to j + oldCap
        if (hiTail == null) hiHead = e; else hiTail.next = e;
        hiTail = e;
    }
} while ((e = next) != null);
if (loTail != null) { loTail.next = null; newTab[j] = loHead; }
if (hiTail != null) { hiTail.next = null; newTab[j + oldCap] = hiHead; }
```

No `hashCode()` is called (the spread hash is stored in each node) and no modulo is computed. Relative order inside each half is preserved. Tree bins are split the same way and untreeified if a half has 6 or fewer nodes.

## 5. Internal Implementation

The full resize decision tree (OpenJDK 25 `resize()`):

```text
oldCap > 0 ?
 ├─ oldCap ≥ 2^30           → threshold = Integer.MAX_VALUE; stop growing
 └─ newCap = oldCap << 1; if oldCap ≥ 16 → newThr = oldThr << 1
oldCap == 0 and threshold > 0 (initial capacity was requested)
 └─ newCap = threshold (already rounded to a power of two)
otherwise (default constructor)
 └─ newCap = 16, newThr = 12
if newThr still 0 → newThr = (int)(newCap * loadFactor)
allocate Node[newCap]; split every old bucket into lo/hi
```

Two subtleties:

- Before the table exists, the `threshold` field temporarily stores the *requested initial capacity*.
- `put` resizes **after** inserting when `++size > threshold`. `computeIfAbsent`, `compute` and `merge` check **before** inserting (`size > threshold`), so a map grown only through them can briefly hold one entry more than its threshold.

Explore resizing, splitting and treeification step by step:

```viz
hashmap
```

Use the scenario buttons: "13 integer keys" shows the first resize; "Keys 5, 21, 37, 53" shows a bucket splitting into lo/hi; "Aa/BB strings" shows a chain forcing two resizes and then a tree bin.

## 6. Memory Representation

```text
Before resize (capacity 16, threshold 12)      After resize (capacity 32, threshold 24)
[5] → 5 → 21 → 37 → 53                         [5]  → 5 → 37         (hash & 16 == 0: lo)
                                               [21] → 21 → 53        (hash & 16 != 0: hi)

  5 = 0b000101   21 = 0b010101   37 = 0b100101   53 = 0b110101
            bit 4 (value 16):  0          1          0          1

During resize both tables exist: old Node[16] + new Node[32] (nodes are moved, not copied).
Tree bin: TreeNode ≈ 56 bytes vs Node ≈ 32 bytes (HotSpot model, see Internals IV).
```

## 7. Runnable Java Example

```example
m07/HashMapResizeDemo
m07/TreeificationDemo
```

## 8. Execution Walkthrough

**`HashMapResizeDemo`**

1. A new map has no table. The first `put` allocates 16 buckets with threshold 12.
2. Puts #13, #25, #49 and #97 trigger resizes to 32, 64, 128 and 256: each time `size` exceeds the threshold (12, 24, 48, 96). Five allocations to hold 100 entries.
3. Integer keys 5, 21 and 37 hash to themselves and share bucket 5 in a 16-slot table (`k & 15 == 5`). After ten filler keys push the size to 13, the table doubles; `21 & 16 != 0`, so 21 moves to bucket 21; 5 and 37 stay in bucket 5, in their original relative order.
4. `new HashMap<>(100)` creates a 128-slot table whose threshold is 96, so the 97th put still resizes, to 256. `HashMap.newHashMap(100)` asks for `ceil(100 / 0.75) = 134` → 256 slots and never resizes.

**`TreeificationDemo`**

1. `CollidingKey` always returns hash code 42, so every key goes to the same bucket (10 in a 16-table, 42 in a 64-table).
2. Sizes 1–8: an ordinary chain in a 16-slot table.
3. Size 9: the chain would reach 9 nodes, but the table is below 64 buckets — `treeifyBin` resizes to 32 instead. The chain stays a list (all keys still share a bucket: the hash is identical).
4. Size 10: same again — resize to 64.
5. Size 11: now the table has 64 buckets, so the bin is converted to `TreeNode`s. Lookups still work: `get(new CollidingKey(7))` returns 7, using `compareTo` to navigate the tree because the record implements `Comparable<CollidingKey>`.

## 9. Complexity Analysis

| Aspect | Cost |
|---|---|
| Lookup in a plain chain of k nodes | O(k) |
| Lookup in a tree bin of k comparable (or distinct-hash) keys | O(log k) |
| Lookup in a tree bin of k non-comparable identical-hash keys | up to O(k) |
| One resize | O(capacity + size): allocate the new table, visit every old bucket and node |
| Resizes while inserting n entries from empty | O(log n) resizes, O(n) total work → amortized O(1) per `put` |
| Memory | table of `capacity` references + one node per entry; capacity ≤ size / 0.75 × 2 right after a resize |

A single resize of a 10-million-entry map touches every entry and allocates a new 16- or 32-million-slot array — an O(n) pause inside one `put` call. Pre-sizing avoids it.

## 10. Incorrect Implementation

```java
// "We expect 10,000 entries, so..." — table 16,384, threshold 12,288: fine.
// "We expect 13,000 entries" — new HashMap<>(13_000): table 16,384, threshold 12,288 → one resize to 32,768.
Map<String, Customer> byEmail = new HashMap<>(13_000);

// A key type whose hashCode ignores most of the key → long chains / tree bins
record Sku(String code) {
    @Override public int hashCode() { return code.length(); } // legal, terrible
}

// Tuning the load factor up to "save memory" on a hot lookup path
Map<Long, Price> prices = new HashMap<>(1 << 16, 4.0f);       // ~4 entries per bucket on average
```

## 11. Correct Implementation

```java
Map<String, Customer> byEmail = HashMap.newHashMap(13_000);   // Java 19+: sized for 13,000 mappings
// Java 17: new HashMap<>((int) Math.ceil(13_000 / 0.75))

record Sku(String code) {}                                    // derived hashCode uses the whole code

Map<Long, Price> prices = HashMap.newHashMap(expectedPrices); // default load factor 0.75
```

Pre-sizing with `newHashMap` prevents every intermediate resize; the derived record `hashCode` distributes keys; the default load factor keeps chains short. Change the load factor only with measurements in hand.

## 12. Enterprise Use Case

**Batch reference-data loading.** A nightly job loads 5 million product records into an in-memory `Map<ProductId, Product>` before enriching orders.

- With `new HashMap<>()` the table grows 16 → 32 → … → 8,388,608: **19 resizes**, the last ones each walking millions of nodes and allocating tens of megabytes of new table, while the old table is still alive.
- With `HashMap.newHashMap(5_000_000)` the table is allocated once at 8,388,608 buckets (threshold 6,291,456) and filled without any resize.
- `ProductId` is a record over a `long`; its hash code is derived from `Long.hashCode`, well distributed for sequential IDs, and spreading takes care of IDs that differ only in high bits.

**Untrusted string keys.** A public endpoint accepts JSON objects whose field names become `HashMap` keys. An attacker can submit thousands of distinct names with the same `String.hashCode()`. Because `String` implements `Comparable<String>`, colliding names in a ≥ 64-bucket table end up in a tree bin with O(log k) lookups — the JDK 8 mitigation (JEP 180) for this class of attack. Still cap input sizes; the mitigation reduces the damage, it does not remove it.

## 13. Alternatives and Trade-offs

- **Higher load factor (e.g. 1.0)**: less memory for the table, longer average chains. **Lower (e.g. 0.5)**: faster lookups, more memory and more resizes.
- **`TreeMap`**: no resizing pauses, O(log n) guaranteed, but slower average lookups and more memory per entry than a plain `Node`.
- **`ConcurrentHashMap`**: resizes cooperatively across threads (different implementation, also uses tree bins).
- **Immutable `Map.copyOf`**: exactly sized open-addressing table, no resizes after construction — good for reference data that never changes.

## 14. Edge Cases

- **`new HashMap<>(0)`**: the first put allocates a 1-slot table whose threshold is 0, and immediately resizes to 2 (tested in `initialCapacityIsRoundedUpToAPowerOfTwo`).
- **Huge maps**: capacity stops at 2³⁰; the threshold becomes `Integer.MAX_VALUE`, and the map keeps accepting entries with longer chains.
- **Removal never shrinks the table**. A map that briefly held millions of entries keeps its large table (and O(capacity) iteration) until it is discarded.
- **`putAll` / copy constructor** pre-size the table from the source map's size before inserting.
- **Treeification needs ≥ 64 buckets**: a small map with a terrible `hashCode` is resized (wasting memory) rather than treeified, until it reaches 64 buckets.
- **Load factor must be positive and not NaN**; `new HashMap<>(16, 0f)` throws `IllegalArgumentException`.

## 15. Interview Questions

**Q1. What happens when a HashMap reaches its threshold?**

<details><summary>Answer</summary>

After the insert that makes `size > threshold`, `resize()` doubles the capacity (and threshold), allocates a new table and redistributes every node. Because capacity is a power of two, each node either stays at index `j` or moves to `j + oldCap`, determined by `(hash & oldCap)`; the stored hash is reused, so `hashCode()` is not called. Each bucket's relative order is preserved. One resize is O(capacity + size); inserting n entries is amortized O(1) per put.

</details>

**Q2. When does a HashMap bucket become a tree?**

<details><summary>Answer</summary>

When a `put` makes a chain reach 9 nodes (i.e. it already held `TREEIFY_THRESHOLD = 8`) and the table has at least `MIN_TREEIFY_CAPACITY = 64` buckets. With a smaller table the map resizes instead. Tree bins convert back to lists when they shrink (≤ 6 nodes on resize split). These are OpenJDK 8+ implementation details (JEP 180).

</details>

**Q3. Why might `new HashMap<>(1000)` still resize before 1,000 entries?**

<details><summary>Answer</summary>

The argument is the table capacity, rounded up to 1,024; the threshold is 1,024 × 0.75 = 768, so the 769th entry triggers a resize. Use `HashMap.newHashMap(1000)` (Java 19+) or `new HashMap<>((int) Math.ceil(1000 / 0.75))`.

</details>

**Q4. Do tree bins guarantee O(log n) worst-case lookups?**

<details><summary>Answer</summary>

Only when colliding keys have distinct full hashes or are mutually `Comparable` (same class `C implements Comparable<C>`). For non-comparable keys with identical hashes, a tree lookup may search both subtrees and degrade toward O(k) for the bin. The JDK comment says performance "degrades gracefully" in these cases. *Misconception:* "HashMap is O(log n) worst case since Java 8."

</details>

**Q5. Why does HashMap double the table rather than grow by 50%?**

<details><summary>Answer</summary>

Power-of-two capacities allow index computation with a mask and allow the split-by-one-bit redistribution (each node stays or moves by exactly `oldCap`), avoiding rehash computation. Doubling also keeps resize cost amortized O(1) per insertion.

</details>

## 16. Practice Exercise

Predict the table capacity and threshold after each step, then verify in the simulator (Integer keys) or by extending `HashMapResizeDemo`:

1. `new HashMap<>(10)`, then 12 puts of distinct Integer keys 0–11.
2. Then 1 more put (key 12).
3. Then remove all 13 keys.
4. Then put key 99.

<details><summary>Solution</summary>

1. `tableSizeFor(10) = 16`; first put allocates 16 with threshold 12. After 12 puts, size 12 is not > 12: **capacity 16, threshold 12**.
2. Size 13 > 12 → resize: **capacity 32, threshold 24**.
3. Removal never shrinks: **32 / 24**, size 0.
4. Key 99 goes to bucket `99 & 31 = 3`: still **32 / 24**, size 1. (Iterating this map visits 32 buckets for one entry.)

</details>

## 17. Key Takeaways

- Collisions are chained; `put` appends at the tail (JDK 8+), compute-family methods may insert at the head — order is not contractual.
- A chain reaching 9 nodes becomes a red-black tree bin **only if the table has ≥ 64 buckets**; otherwise the map resizes.
- Threshold = capacity × load factor (default 0.75); `put` resizes when `size > threshold`.
- Resize doubles the table and splits each bucket into lo (`j`) and hi (`j + oldCap`) by one hash bit.
- The constructor's capacity is a table size hint — use `HashMap.newHashMap(expected)` (Java 19+) to size for entries.

## 18. Official References

- [`java.util.HashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html) — load factor and initial capacity guidance.
- [`HashMap.newHashMap(int)` (since 19)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html#newHashMap(int))
- [JEP 180: Handle Frequent HashMap Collisions with Balanced Trees](https://openjdk.org/jeps/180)
- [OpenJDK 25 source: `HashMap.java` (`resize`, `treeifyBin`, `TreeNode`)](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/HashMap.java)
