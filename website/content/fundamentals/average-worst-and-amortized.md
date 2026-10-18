## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Two statements every Java developer has heard:

- "`HashMap.get` is O(1)."
- "`ArrayList.add` is O(1)."

Both are useful and both are incomplete. A `HashMap` whose keys all collide does not give O(1) lookups. An `ArrayList.add` that triggers a resize copies every existing element — that single call is O(n). Engineers who repeat the slogans without the qualifiers get surprised by latency spikes, by denial-of-service reports against hash tables, and by batch jobs whose memory use doubles at the worst moment.

The fix is to know **which kind of bound** a complexity claim describes: best case, average case, worst case or amortized.

## 3. Beginner-Friendly Explanation

Think of a coffee shop.

- **Worst case:** the longest you could ever wait — every customer ahead of you orders something complicated.
- **Average case:** how long you wait on a typical day, assuming typical customers.
- **Amortized:** the shop empties its waste bin every 50 customers, which takes 5 minutes. One unlucky customer waits the extra 5 minutes, but *spread over 50 customers* the bin costs 6 seconds each. No single customer averages 6 seconds; the **total over a long sequence** works out to 6 seconds per customer.

`ArrayList.add` is like the waste bin: occasionally expensive (resize), cheap on average *over any long sequence of adds*. `HashMap.get` is like the queue: fast on a typical day (well-distributed keys), slow on a bad one (many colliding keys).

## 4. Detailed Technical Explanation

### Four different statements

| Kind | Quantifies over | Example |
|---|---|---|
| **Best case** | the most favourable input of size n | linear search finds the element at index 0: O(1). Rarely useful. |
| **Worst case** | the least favourable input of size n | linear search for an absent element: n comparisons. |
| **Average (expected) case** | a probability distribution over inputs (or over the algorithm's own randomness) | linear search for a uniformly random present element: about n/2 comparisons, still O(n). |
| **Amortized** | the *worst-case total cost* of any sequence of m operations, divided by m | m appends to a growable array cost O(m) in total, so O(1) amortized each. |

Amortized analysis is **not** probabilistic. It guarantees that *no sequence* of operations can be more expensive on average than the bound — even an adversarial one. Average-case analysis relies on assumptions about the input ("hash codes are well distributed") that an adversary or an unlucky data set can violate.

### Why geometric growth gives amortized O(1)

Suppose an array grows by a factor `g > 1` whenever it is full (Java's `ArrayList` uses `g = 1.5`). Appending `m` elements triggers copies of sizes roughly `c, c·g, c·g², …` up to about `m`. That is a geometric series:

```text
total copies ≈ m + m/g + m/g² + …  =  m · g / (g − 1)
```

For `g = 1.5` that is about `3m`; for `g = 2`, about `2m`. Divided over `m` appends: a **constant** number of copies per append, whatever `m` is.

If instead the array grows by a constant `k` slots each time, it resizes about `m/k` times and the copies are `k + 2k + 3k + … ≈ m²/(2k)`. Divided over `m` appends: **O(m) per append**. Constant growth is a classic performance bug.

### Hash tables: average O(1), worst case worse

A hash table distributes keys over `b` buckets. If hash codes are well spread and the table keeps the ratio of entries to buckets bounded (the *load factor*), the expected number of keys per bucket is a constant, so lookups are expected O(1). If many keys share a bucket, a lookup must examine them all.

> [!CONTRACT]
> The `HashMap` Javadoc promises "constant-time performance for the basic operations (get and put), assuming the hash function disperses the elements properly among the buckets". The *assumption* is part of the contract. Nothing promises constant time for adversarial or degenerate keys.

> [!IMPL]
> Since JDK 8 (JEP 180), OpenJDK's `HashMap` converts a long collision chain into a balanced red-black tree once a bucket holds more than 8 entries and the table has at least 64 buckets. For keys that implement `Comparable` this caps a bad bucket at O(log n) per lookup instead of O(n). It is an implementation detail and only fully effective when the colliding keys are mutually comparable. See [HashMap Internals II](/learn/maps/hashmap-internals-collisions-and-resizing).

## 5. Internal Implementation

`ArrayList` in OpenJDK 17–25 grows with this rule (from `ArrayList.grow` and `jdk.internal.util.ArraysSupport.newLength`):

```java title="OpenJDK 25 · java.util.ArrayList.grow (excerpt)"
int newCapacity = ArraysSupport.newLength(oldCapacity,
        minCapacity - oldCapacity, /* minimum growth */
        oldCapacity >> 1           /* preferred growth */);
return elementData = Arrays.copyOf(elementData, newCapacity);
```

`newLength` returns `oldCapacity + max(minimumGrowth, preferredGrowth)`, so a single `add` grows by 50%. The full mechanics are in [ArrayList Internals](/learn/lists/arraylist-internals). The specification only says: "The details of the growth policy are not specified beyond the fact that adding an element has constant amortized time cost."

The `AmortizedGrowth` example below implements both a ×1.5 policy and a +1 policy on a plain `int[]` and counts the copies, so the arithmetic above becomes observable.

## 6. Memory Representation

Amortized growth trades memory for time. Immediately after a resize from capacity 100 to 150, a list holding 101 elements has 49 empty slots:

```text
size 101, capacity 150
[■■■■■■■■■■ ... 101 used ... ■][□□□□ ... 49 unused ... □]
 ← references to elements →    ← null slots: reserved, not yet used →

During the copy itself both arrays are alive:
old: [■ x 100]          new: [■ x 100][□ x 50]     → peak ≈ 2.5 × the old array
```

With a growth factor of 1.5, up to about one third of the backing array can be unused right after a resize, and the copy briefly needs the old and new arrays at once. That transient peak — not the steady state — is often what triggers an `OutOfMemoryError` in a batch job.

## 7. Runnable Java Example

```example
m02/AmortizedGrowth
```

## 8. Execution Walkthrough

1. Each run starts with capacity 10 and appends `n` integers.
2. **ADD_ONE, n = 1,000:** every append after the 10th finds the array full, so there are 990 resizes and `10 + 11 + … + 999 = 499,455` element copies — about 499 copies per append.
3. **ADD_ONE, n = 100,000:** 99,990 resizes and almost 5 billion copies — about 50,000 per append. The per-append cost grew 100× when the input grew 100×: O(n) per operation.
4. **MULTIPLY_1_5, n = 1,000:** only 12 resizes (10 → 15 → 22 → 33 → … → 823 → 1,234) and 2,456 copies — 2.46 per append.
5. **MULTIPLY_1_5, n = 100,000:** 23 resizes and 2.13 copies per append. The per-append cost stays roughly constant (it fluctuates depending on how close `n` lands to the last resize), as the geometric-series argument predicts: always below `g/(g − 1) = 3`.

## 9. Complexity Analysis

| Operation | Worst single call | Amortized | Average (expected) |
|---|---|---|---|
| `ArrayList.add(e)` (append) | O(n) — resize copies n references | O(1) | — (no randomness involved) |
| `ArrayList.add(0, e)` | O(n) | O(n) | O(n) |
| `HashMap.get` / `put` | O(n) with all keys in one list bin; O(log n) in a tree bin of comparable keys | `put`: O(1) amortized over resizes, *given* good dispersion | O(1) |
| Linear search | O(n) | — | O(n) (≈ n/2 when present) |

Space: geometric growth keeps unused capacity proportional to size — O(n) — with a transient peak during each copy.

## 10. Incorrect Implementation

A hand-rolled buffer in a CSV importer:

```java
// Grows by a fixed 1,000 slots: looks generous, is quadratic.
if (size == rows.length) {
    rows = Arrays.copyOf(rows, rows.length + 1_000);
}
rows[size++] = row;
```

With 10 million rows it resizes 10,000 times and copies about 5 × 10¹⁰ references in total. Constant-step growth only delays the quadratic behaviour.

A second classic: **quoting an average-case bound as a guarantee**. "Our de-duplication endpoint is O(1) per item because it uses a HashMap" is false for an attacker who submits many keys with colliding hash codes, or for a key class whose `hashCode()` returns a constant.

## 11. Correct Implementation

```java
// Prefer the JDK's growable list: geometric growth, amortized O(1) appends.
List<Row> rows = new ArrayList<>(expectedRowsOrDefault); // pre-size when you know the count
rows.add(row);
```

If you must manage your own array, grow multiplicatively:

```java
if (size == rows.length) {
    int newCapacity = Math.max(rows.length + (rows.length >> 1), size + 1); // ×1.5, at least +1
    rows = Arrays.copyOf(rows, newCapacity);
}
```

And document hash-based costs honestly: "O(1) expected per item, assuming well-distributed `hashCode` implementations; worst case bounded by tree bins for `Comparable` keys."

## 12. Enterprise Use Case

**Latency-sensitive API aggregating results.** A pricing endpoint builds a list of up to 50,000 quote lines per request. Average latency is fine, but p99 latency shows spikes. The cause is not GC tuning but resizes: each request grows a default `ArrayList` from 10 to ~50,000 slots through about 22 resizes, discarding backing arrays whose combined length is roughly three times the final number of lines. The service knows the line count before building the list, so `new ArrayList<>(lineCount)` removes every resize — the *amortized* cost was always O(1), but the *worst single calls* were what p99 measured.

**Untrusted keys.** A public API caches results per client-supplied string. Because the keys are attacker-controlled, average-case reasoning about `String.hashCode` dispersion does not hold. Mitigations: cap request sizes, use bounded caches, and rely on `HashMap`'s tree bins (String is `Comparable`) as a backstop — not as the plan.

## 13. Alternatives and Trade-offs

- **Pre-sizing** (`new ArrayList<>(n)`, `HashMap.newHashMap(n)`) removes resizes entirely when the size is known; it wastes memory when the estimate is far too high.
- **Larger growth factors (×2)** mean fewer resizes but more wasted capacity; ×1.5 is a compromise.
- **Chunked structures** (lists of fixed-size blocks) avoid large copies and large contiguous allocations at the cost of more complex indexing.
- **Tree-based maps (`TreeMap`)** give a *worst-case* O(log n) guarantee, at the price of a higher constant than a well-behaved hash table and a requirement for ordering.

## 14. Edge Cases

- **The first append:** a `new ArrayList<>()` holds no array until its first `add`, which allocates 10 slots — still O(1).
- **Bulk appends:** `addAll` grows once to fit all new elements, so it never pays several resizes for one call.
- **Near the maximum array length:** growth is capped near `Integer.MAX_VALUE − 8`; beyond that `OutOfMemoryError` is thrown. Amortized arguments assume growth is always possible.
- **Removing elements never shrinks an `ArrayList` or a `HashMap` table.** Capacity reached once stays allocated until `trimToSize()` (lists) or a new map is created.
- **Amortized ≠ every call is fast.** Real-time or low-latency code may care about the worst single call; pre-size or choose a structure without large copies.

## 15. Interview Questions

**Q1. What is the difference between average-case and amortized complexity?**

<details><summary>Answer</summary>

Average case is an expectation over a distribution of inputs (or random choices) and can be violated by unlucky or adversarial inputs. Amortized complexity bounds the worst-case total cost of any sequence of operations; it is a guarantee, but individual operations may be expensive. `ArrayList.add` is amortized O(1); `HashMap.get` is O(1) on average. *Follow-up:* "Can an operation be both?" — `HashMap.put` is O(1) expected per operation and its resizing cost is amortized.

</details>

**Q2. Why does `ArrayList` grow by a factor instead of a fixed number of slots?**

<details><summary>Answer</summary>

Fixed-step growth makes the total copying cost of n appends O(n²), i.e. O(n) per append. Multiplicative growth makes the copy sizes a geometric series summing to O(n), i.e. O(1) amortized per append. The Javadoc only promises the amortized O(1) property; the factor (1.5 in OpenJDK) is an implementation detail.

</details>

**Q3. Is `HashMap.get` O(1)? Answer as precisely as you can.**

<details><summary>Answer</summary>

Expected O(1) if `hashCode` disperses keys well and the load factor bounds the entries per bucket. Worst case: O(n) for a bucket that is a linked list of n colliding keys; since JDK 8, a bucket with more than 8 entries (in a table of at least 64 buckets) becomes a red-black tree, giving O(log n) when the keys are mutually `Comparable`. Non-comparable colliding keys may still require searching the whole tree bin. *Misconception:* "Java fixed hash collisions in JDK 8" — it bounded the damage for comparable keys; it did not make lookup O(1) in the worst case.

</details>

**Q4. A list is built with 1 million `add` calls. Roughly how many element copies does resizing cause on OpenJDK, starting from `new ArrayList<>()`?**

<details><summary>Answer</summary>

About 2.4 million (the `ArrayListGrowthDemo` example computes 2,430,972 with the OpenJDK growth model) — on the order of 2–3 copies per element, consistent with the geometric bound g/(g − 1) = 3 for g = 1.5. With `new ArrayList<>(1_000_000)` the answer is zero.

</details>

## 16. Practice Exercise

A colleague's `RingLog` keeps the last N log lines in an array that doubles when full and **halves when it drops to half full**. Explain why a workload that alternates `add` and `remove` exactly at the boundary is expensive, and propose a fix that keeps amortized O(1) for both operations.

<details><summary>Solution</summary>

At capacity C with C/2 elements, one `add` makes it full and the next `add` doubles it (copy of C elements); a `remove` back to C/2 + … triggers halving at exactly half full (another copy). Alternating at the threshold makes *every* operation copy O(n) elements — amortization breaks because the expensive operations are not separated by enough cheap ones.

Fix: use hysteresis — grow when full, but shrink only when the array drops to **one quarter** full (and shrink to half). After any resize the array is half full, so at least C/4 cheap operations must occur before the next resize, which pays for the O(C) copy. Both operations become amortized O(1).

</details>

## 17. Key Takeaways

- Always say **which** bound you mean: worst case, average (expected) or amortized.
- **Amortized** is a guarantee over sequences; **average** depends on input assumptions.
- Multiplicative growth ⇒ amortized O(1) appends; additive growth ⇒ O(n) per append.
- `HashMap` is O(1) *expected*, conditional on good hash dispersion; JDK 8+ tree bins bound bad buckets to O(log n) for comparable keys.
- Worst single calls (resizes) drive tail latency and peak memory; pre-size when you know the size.

## 18. Official References

- [`java.util.ArrayList` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayList.html) — "constant amortized time cost" for `add`.
- [`java.util.HashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html) — performance "assuming the hash function disperses the elements properly".
- [JEP 180: Handle Frequent HashMap Collisions with Balanced Trees](https://openjdk.org/jeps/180)
- [OpenJDK 25 source: `ArrayList.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/ArrayList.java)
- [OpenJDK 25 source: `ArraysSupport.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/jdk/internal/util/ArraysSupport.java)
