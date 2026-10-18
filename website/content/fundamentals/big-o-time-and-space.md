## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

A reconciliation job that finished in two seconds against a test file of 1,000 customer records takes more than five hours in production against 1,000,000 records. Nobody changed the code. The input grew by a factor of 1,000 and the running time grew by a factor of roughly 10,000.

That is not a mysterious performance bug. It is what happens when an algorithm's work grows with the *square* of its input: 1,000× more data means about 1,000,000× more pairwise comparisons. A developer who can look at a loop and say "this is quadratic" before it ships saves the production incident.

Algorithmic complexity is the vocabulary for that judgement. It answers one question: **as the input grows, how does the amount of work (or memory) grow?**

## 3. Beginner-Friendly Explanation

Imagine three ways to find a customer's file:

- **A labelled drawer** — you know the drawer number, you open it. It takes the same effort whether the cabinet has 10 drawers or 10,000. That is *constant* work: **O(1)**.
- **A phone book** — open the middle, decide whether the name is earlier or later, discard half, repeat. Doubling the book adds just *one* more step. That is *logarithmic* work: **O(log n)**.
- **A pile of unsorted paper** — check each sheet until you find it. Twice the paper, twice the effort. That is *linear* work: **O(n)**.

Now imagine checking whether *any two* sheets in the pile are duplicates by comparing every sheet with every other sheet. Twice the paper means *four* times the comparisons. That is *quadratic* work: **O(n²)**.

Big O notation names these growth shapes. It deliberately ignores constant factors ("each comparison takes 3 ns") because, as inputs grow, the shape dominates.

## 4. Detailed Technical Explanation

### What Big O actually states

`f(n) = O(g(n))` means: there are constants `c > 0` and `n₀` such that for every `n ≥ n₀`, `f(n) ≤ c · g(n)`. In words, **beyond some input size, f grows no faster than a constant multiple of g**. It is an *upper bound on the growth rate*.

Three consequences matter in daily engineering:

1. **Constants and lower-order terms disappear.** `3n² + 200n + 7` is `O(n²)`. For small `n` the `200n` term may dominate the real runtime, but it does not change the class.
2. **Big O says nothing about absolute speed.** An `O(n)` algorithm with a large constant can be slower than an `O(n log n)` one for every input you will ever see. (Lesson 3 of this module shows why memory layout often decides the constant.)
3. **Big O is about a specific cost measure.** "Time" usually means a count of basic operations (comparisons, element reads, hash computations); "space" means *extra* memory beyond the input. Always say which.

Strictly, `O` is an upper bound, `Ω` a lower bound and `Θ` a tight bound. Engineering conversations use "O" loosely to mean the tight bound ("ArrayList.get is O(1)"), which is fine as long as you know the distinction exists.

### The common classes, in Java terms

| Class | Name | Doubling `n` multiplies work by | Typical Java example |
|---|---|---|---|
| O(1) | constant | 1 | `array[i]`, `ArrayList.get(i)`, `HashMap.get(key)` on average |
| O(log n) | logarithmic | adds one step | `Arrays.binarySearch`, `TreeMap.get` |
| O(n) | linear | 2 | a `for` loop over all elements, `ArrayList.contains` |
| O(n log n) | linearithmic | a bit more than 2 | `List.sort`, `Arrays.sort` on objects |
| O(n²) | quadratic | 4 | nested loops over the same data, `list.contains` inside a loop |

### Time vs space

Space complexity counts **additional** memory. Finding duplicates with nested loops needs `O(1)` extra space but `O(n²)` time; putting every element into a `HashSet` needs `O(n)` extra space but only `O(n)` expected time. Most real optimisations are exactly this trade: spend memory on an index to save time.

> [!CONTRACT]
> Complexity statements in the Java API documentation are part of the documented behaviour of a class. For example the `ArrayList` Javadoc states that `get` runs in constant time and `add` in *amortized* constant time, and the `TreeMap` Javadoc guarantees `log(n)` time for `containsKey`, `get`, `put` and `remove`. Statements you derive from reading JDK source code are implementation details unless the Javadoc promises them.

## 5. Internal Implementation

How do you *find* the complexity of code? Count how many times the innermost basic operation runs as a function of `n`:

- **A single loop** over `n` elements → `n` executions → `O(n)`.
- **A loop that halves its range** each iteration (binary search) → after `k` iterations `n / 2ᵏ` elements remain; it stops when that reaches 1, so `k ≈ log₂ n` → `O(log n)`.
- **Two nested loops** where the inner one runs `i + 1 … n − 1` → `(n − 1) + (n − 2) + … + 1 = n(n − 1)/2` → `O(n²)`.
- **Divide and conquer** (merge sort): `log₂ n` levels of splitting, and each level merges `n` elements in total → `O(n log n)`.
- **A method call counts as its own complexity.** `list.contains(x)` inside a loop over `list` is a loop inside a loop.

The last point is where most production quadratic code hides. It does not *look* nested:

```java
for (Order order : orders) {                 // n iterations
    if (!processedIds.contains(order.id())) { // ArrayList.contains: O(n) each
        ...
    }
}
```

## 6. Memory Representation

Space complexity is about how many objects or slots an algorithm allocates as `n` grows:

```text
Nested-loop duplicate check                 HashSet duplicate check
input list:  [e0][e1][e2] ... [en-1]        input list:  [e0][e1][e2] ... [en-1]
extra:       i, j  (two ints)               extra:       HashSet ──► table of buckets ──► up to n nodes
             O(1) extra space                            O(n) extra space
```

The `HashSet` costs real memory — an array of buckets plus one node object per element (the exact bytes are examined in [HashMap Internals IV](/learn/maps/hashmap-internals-production-concerns)) — but it turns the time from quadratic to linear.

## 7. Runnable Java Example

The first program counts — rather than times — the steps performed by five algorithms. Counting is deterministic, so you can compare your output with ours.

```example
m02/GrowthRates
```

The second program finds duplicate e-mail addresses two ways and counts the work each needs.

```example
m02/DuplicateDetection
```

## 8. Execution Walkthrough

**`GrowthRates`**

1. `constantAccess` reads `data[length / 2]`. The JVM computes the element's address from the array base, the index and the element size — one step regardless of length. The column stays `1`.
2. `binarySearchSteps` searches a sorted array for `-1`, which is absent and smaller than everything, so the search runs until the range is empty. For 16 elements it needs 4 comparisons, for 1,024 it needs 10, for 65,536 it needs 16: multiplying the input by 64 added only 6 steps. That is `log₂ n`.
3. `linearSumSteps` touches each element once: the count equals `n`.
4. `mergeSortComparisons` counts comparisons inside the merge step. The totals (47, 7,679, 786,431) stay below `n · log₂ n` (64, 10,240, 1,048,576): every level of the recursion merges at most `n` elements and there are `log₂ n` levels.
5. `allPairsComparisons` visits every pair once: `n(n − 1)/2`. For 65,536 elements that is 2,147,450,880 — more than two billion comparisons. Multiply the input by 64 and the work grows by about 4,096.

**`DuplicateDetection`**

1. For `n = 10,000` the nested loop performs 49,995,000 `equals` comparisons.
2. The hash-set version performs one `add` per element — 10,000 probes. `Set.add` returns `false` when an equal element is already present, so the membership test and the insertion are a single operation.
3. Both produce the same duplicates, in first-seen order, because results are collected in a `LinkedHashSet`.

## 9. Complexity Analysis

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Nested-loop duplicates | Θ(n²) comparisons | O(1) (+ result) | Always compares every pair, even if the first two elements are duplicates |
| `HashSet` duplicates | O(n) expected | O(n) | Each `add` is O(1) on average; depends on `hashCode` quality (see [HashMap Internals I](/learn/maps/hashmap-internals-hashing-and-indexing)) |
| Sort, then scan neighbours | O(n log n) | O(n) for `List.sort` on objects (TimSort may allocate a temporary array of up to n/2 elements) | Useful when you need sorted output anyway |

The hash-based version is *expected* O(n) because hash-table operations are O(1) on average, not in the worst case. The next lesson makes that distinction precise.

## 10. Incorrect Implementation

A realistic version of the bug: de-duplicating incoming events against a list of already-processed IDs.

```java
List<String> processed = new ArrayList<>();
for (Event e : events) {
    if (!processed.contains(e.id())) { // linear scan of everything processed so far
        processed.add(e.id());
        publish(e);
    }
}
```

With 200,000 events this performs up to about 20 billion `String.equals` calls (200,000² / 2). The code is short, readable and passes every unit test that uses ten events.

## 11. Correct Implementation

```java
Set<String> processed = new HashSet<>();
for (Event e : events) {
    if (processed.add(e.id())) {       // true only the first time this id is seen
        publish(e);
    }
}
```

Why it is valid: `Set.add` is specified to return `true` only if the set did not already contain an equal element, so one call both tests and records membership. `HashSet` performs it in O(1) expected time, making the loop O(n). If the order of first appearance matters later, use `LinkedHashSet` — same complexity, plus insertion order.

## 12. Enterprise Use Case

A payments service imports a nightly settlement file and must flag transactions whose `merchantReference` appears more than once.

- **Input size:** 2–5 million rows.
- **Quadratic approach:** comparing every pair would need roughly 2 × 10¹² to 1.25 × 10¹³ comparisons — not a viable nightly job at any realistic speed.
- **Linear approach:** stream the rows once, `Set.add(reference)`, and record the ones that return `false`.
- **Space consideration:** 5 million distinct `String` keys in a `HashSet` cost hundreds of megabytes. If that does not fit, the alternatives are database-side detection (`GROUP BY merchant_reference HAVING COUNT(*) > 1`, using an index) or an external sort followed by a neighbour scan. Choosing among them is a space–time trade-off, not just a time one.

## 13. Alternatives and Trade-offs

- **Hashing (O(n) time, O(n) space)** — best general choice when elements have good `equals`/`hashCode` and memory is available.
- **Sorting first (O(n log n) time)** — no hash function needed, produces ordered output, and duplicates become neighbours. Preferable when you need sorted output anyway or the data is already sorted.
- **Nested loops (O(n²) time, O(1) space)** — acceptable for *tiny, bounded* inputs (for example, comparing the five address lines of one customer). Write a comment stating the bound.
- **Database or external processing** — when the data does not fit in heap, let the database's indexes and sort/hash operators do the work.

## 14. Edge Cases

- **Empty and single-element input:** every algorithm above does zero comparisons; make sure your code does not assume at least two elements (the tests in `ComplexityExamplesTest` cover this).
- **Small n:** for `n ≤ ~10`, constant factors dominate; an O(n²) loop may be the fastest and simplest option.
- **All elements equal:** the nested loop still compares every pair; the hash version still does `n` probes, but every probe after the first finds a match.
- **Integer overflow in your own counters:** the pair count `n(n − 1)/2` no longer fits in an `int` once `n` reaches 65,537, and the intermediate product `n · (n − 1)` overflows `int` already at `n = 46,342`. Use `long` for counts — as `GrowthRates` does.
- **Binary search midpoint:** `(low + high) / 2` overflows for very large arrays; `(low + high) >>> 1` does not. (The JDK's own `Arrays.binarySearch` uses the unsigned shift for this reason.)

## 15. Interview Questions

**Q1. If an algorithm is O(n log n), is it always faster than an O(n²) one?**

<details><summary>Answer</summary>

No. Big O describes growth, not absolute speed. For small inputs the O(n²) algorithm can win because of smaller constant factors — which is why the JDK's object sort (TimSort) uses binary insertion sort, an O(n²) algorithm, for short runs. Beyond some input size the O(n log n) algorithm must win, but that size depends on constants. *Follow-up:* "How would you find the crossover point?" — measure with a proper benchmark (JMH) on realistic data.

</details>

**Q2. What is the time complexity of this method?**

```java
boolean hasCommon(List<String> a, List<String> b) {
    for (String s : a) if (b.contains(s)) return true;
    return false;
}
```

<details><summary>Answer</summary>

O(|a| · |b|) in the worst case when `b` is a `List` (`contains` is linear). Converting `b` to a `HashSet` once makes it O(|a| + |b|) expected. A common misconception is to call it O(n) because there is only one visible loop.

</details>

**Q3. Why do we drop constants in Big O, and when should you not ignore them?**

<details><summary>Answer</summary>

Because asymptotic growth eventually dominates any constant and the notation is meant to compare growth rates independent of hardware. You should not ignore them when inputs are bounded and small, on hot paths where a 3× constant matters, or when comparing two algorithms of the *same* class (two O(n) list traversals can differ several-fold because of memory layout).

</details>

**Q4. What is the space complexity of finding duplicates with a HashSet, and can you do better?**

<details><summary>Answer</summary>

O(n) extra space. You can reach O(1) extra space with nested loops (O(n²) time) or O(1)–O(log n) extra space with an in-place sort of a primitive array followed by a neighbour scan (O(n log n) time) — at the cost of modifying or copying the input. The "best" choice depends on whether memory or time is the constraint.

</details>

## 16. Practice Exercise

Your service receives two lists of account numbers, `ledger` (n entries) and `bank` (m entries). Write a method returning the account numbers present in `ledger` but missing from `bank`, preserving `ledger` order and without duplicates. State its time and space complexity, and the complexity of the obvious nested-loop version.

<details><summary>Solution</summary>

```java
static List<String> missingFromBank(List<String> ledger, List<String> bank) {
    Set<String> inBank = new HashSet<>(bank);             // O(m) time, O(m) space
    Set<String> result = new LinkedHashSet<>();           // keeps ledger order, drops duplicates
    for (String account : ledger) {                       // O(n)
        if (!inBank.contains(account)) result.add(account); // O(1) expected each
    }
    return List.copyOf(result);
}
```

Time O(n + m) expected, extra space O(n + m). The nested-loop version (`bank.contains` inside the loop) is O(n · m) time and O(1) extra space besides the result. `List.copyOf` returns an unmodifiable list, a good default for a method result.

</details>

## 17. Key Takeaways

- Big O describes **how work grows** with input size, not how fast code runs.
- Recognise the shapes: single loop O(n), halving O(log n), nested loops O(n²), divide-and-conquer with linear merge O(n log n).
- **Method calls carry their own complexity** — `list.contains` inside a loop is a nested loop.
- Time and space trade against each other; a hash-based index is the most common trade in business code.
- Verify complexity claims by **counting operations**; measure absolute speed with JMH, never with a single timing loop.
- Complexity statements in Javadoc are documented behaviour; ones you infer from JDK source are implementation details.

## 18. Official References

- [`java.util.ArrayList` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayList.html) — documented constant and amortized constant costs.
- [`java.util.TreeMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/TreeMap.html) — guaranteed `log(n)` operations.
- [`java.util.Arrays` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Arrays.html) — `binarySearch` and `sort` contracts.
- [`java.util.Set#add`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Set.html#add(E)) — the return-value contract used in the correct implementation.
- [Collections Framework overview (Java 25)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/doc-files/coll-overview.html)
