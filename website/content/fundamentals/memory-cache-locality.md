## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Iterating a `LinkedList` and iterating an `ArrayList` are both O(n). Summing an `int[]` is also O(n). Yet on real hardware these loops can differ several-fold in speed, and the boxed versions use five to ten times more memory than the primitive one. Big O is silent about all of it because it counts *operations*, not *where the data lives*.

In enterprise systems this gap shows up as: a batch job that needs a 16 GB heap for data that is 2 GB on disk; a service whose GC pauses grow with traffic; a "theoretically better" data structure that benchmarks slower. To reason about these you need a model of memory — objects, references, headers, allocation and caches — and the discipline to measure instead of guessing.

## 3. Beginner-Friendly Explanation

Picture a warehouse.

- An **`int[]`** is a shelf with numbered boxes side by side. Walking along the shelf you pick up item after item without stopping.
- An **`ArrayList<Integer>`** is a shelf of *slips of paper*, each saying where in the warehouse the actual item is. You read the slip, then walk to the item. The slips are side by side, and if items were stored in the order they arrived they are often near each other — but every item is a separate trip.
- A **`LinkedList<Integer>`** is a treasure hunt: each box contains the item's location *and the location of the next box*. You cannot know where box 5 is until you have opened box 4.

The CPU is the worker. It is extremely fast at the shelf (it can even grab the next few boxes before you ask — *prefetching*), slower at following slips, and slowest at treasure hunts, where each step must wait for the previous one to arrive from memory.

## 4. Detailed Technical Explanation

### Objects and references in Java

The Java Language Specification defines *what* objects and references are, not how they are laid out in memory. Everything below about sizes and headers describes **HotSpot, the JVM in OpenJDK/Temurin**, and is labelled as such.

> [!IMPL]
> On 64-bit HotSpot (JDK 25) with default settings and a heap below about 32 GB:
> - every object starts with a **12-byte header** (mark word + compressed class pointer);
> - a reference (field or array slot) occupies **4 bytes** ("compressed oops");
> - arrays add a 4-byte length after the header (16 bytes total before the elements);
> - objects are **aligned to 8 bytes**.
>
> JDK 25 also offers **compact object headers** (JEP 519) as a product option, `-XX:+UseCompactObjectHeaders`, which shrinks headers to 8 bytes. It is not enabled by default. Use [JOL](https://github.com/openjdk/jol) to see the real layout on your JVM.

Under that model:

| Thing | Layout | Bytes |
|---|---|---|
| `Integer` | header 12 + `int value` 4 | 16 |
| `LinkedList.Node` | header 12 + `item`, `next`, `prev` (3 × 4) | 24 |
| `int[]` of n | 16 + 4n, aligned | ≈ 4 per element |
| `Object[]` of n | 16 + 4n, aligned | ≈ 4 per slot (references only) |

### Caches and locality

CPUs read memory in **cache lines** (commonly 64 bytes). Reading one `int` from an array brings its neighbours into the cache for free; the hardware **prefetcher** also notices sequential access and fetches ahead. This is **spatial locality**.

Following a reference to an object somewhere else in the heap may miss the cache. In a linked structure, the address of the next node is only known after the current node arrives, so misses cannot overlap — this is **pointer chasing**, and it is latency-bound.

### Allocation and garbage collection

HotSpot allocates most objects with a pointer bump in a thread-local allocation buffer (TLAB), which is very cheap. Objects allocated one after another therefore *often* start out adjacent — so a freshly built `LinkedList` may traverse better than one that has lived through many insertions, removals and GC cycles. You cannot rely on either layout: the collector is free to move objects.

The real costs of allocation-heavy structures are:

- **more bytes** per element (headers, padding, extra references),
- **more objects** for the GC to trace and copy,
- **more indirections** per element visited.

### Boxing

Collections hold references, so `List<Integer>` stores `Integer` objects. Autoboxing (`list.add(42)`) calls `Integer.valueOf`.

> [!CONTRACT]
> The JLS (§5.1.7) requires boxing of `int` values between −128 and 127 to return identical (cached) `Integer` objects. Outside that range, boxing may or may not allocate a new object; in practice on HotSpot it usually does (the cache's upper bound can be raised with `-XX:AutoBoxCacheMax`).

## 5. Internal Implementation

What a traversal does in each structure:

```java title="What the CPU does per element (conceptual)"
// int[]                    : load a[i]                            → sequential, prefetch-friendly
// ArrayList<Integer>       : load elementData[i] (a reference)   → sequential
//                            load ref.value                       → one dependent load per element
// LinkedList<Integer>      : load node.item, node.next            → the NEXT node's address depends on this load
//                            load item.value                      → another dependent load
```

`ArrayList`'s iterator reads `elementData[cursor]`; `LinkedList`'s iterator follows `next` pointers (see [ArrayList vs LinkedList](/learn/lists/arraylist-vs-linkedlist)). Both are O(n). The difference is the **number and dependency of memory loads per element**, which Big O does not model.

## 6. Memory Representation

```text
int[] {7, 8, 9}
┌────────────────┬────┬────┬────┐
│ header+length  │ 7  │ 8  │ 9  │   one object, values inline
└────────────────┴────┴────┴────┘

ArrayList<Integer> [7, 8, 9]
ArrayList ──► Object[] ┌────────┬────┬────┬────┐
                       │ header │ ●  │ ●  │ ●  │   references
                       └────────┴─┼──┴─┼──┴─┼──┘
                                  ▼    ▼    ▼
                           Integer(7) Integer(8) Integer(9)   (cached here: −128..127)

LinkedList<Integer> [7, 8, 9]
LinkedList(first,last)
   ▼
 Node ⇄ Node ⇄ Node        each Node: item ●, next ●, prev ●
   ▼       ▼      ▼
 Integer Integer Integer
```

## 7. Runnable Java Example

The example below is a **model**: it computes footprints from the stated layout rules rather than measuring a JVM. That keeps the output deterministic and makes every assumption visible in the code.

```example
m02/MemoryFootprintModel
```

To compare traversal *speed*, the java-examples project contains a JMH benchmark, `ListIterationBenchmark`. This handbook deliberately publishes **no timing numbers** for it — results depend on CPU, memory, JVM flags and heap state. Run it yourself:

```bash title="Run the benchmark on your machine"
cd java-examples
./gradlew jmh -PjmhArgs="ListIterationBenchmark -f 1 -wi 5 -i 5"
```

## 8. Execution Walkthrough

1. `intArray(1_000_000)`: 16 header bytes + 4,000,000 bytes of values = **4.0 bytes per element**, one object.
2. `arrayListOfInteger`: a 24-byte `ArrayList`, a 4,000,016-byte reference array and one million 16-byte `Integer` objects = **20 bytes per element** and 1,000,002 objects. (If the values were all between −128 and 127 they would share cached `Integer`s and the list would cost about 4 bytes per element.)
3. `linkedListOfInteger`: per element, a 24-byte node plus a 16-byte `Integer` = **40 bytes per element** and two million objects.
4. The last line counts objects. For the GC, *object count* matters as much as bytes: each object must be traced, and in a copying collector, copied.

## 9. Complexity Analysis

| Structure (n ints) | Iteration time | Memory | Objects | Loads per element |
|---|---|---|---|---|
| `int[]` | O(n) | ≈ 4n B | 1 | 1, sequential |
| `ArrayList<Integer>` | O(n) | ≈ 20n B (model, uncached values) | n + 2 | 2 (one dependent) |
| `LinkedList<Integer>` | O(n) | ≈ 40n B (model) | 2n + 1 | 3 (chained dependencies) |

Same asymptotic class, very different constants. That is the core lesson: **use Big O to rule out bad algorithms, then use data layout and measurement to choose among good ones.**

## 10. Incorrect Implementation

Two common mistakes:

```java
// 1. Timing with System.nanoTime in a cold loop and drawing conclusions
long t0 = System.nanoTime();
long sum = 0;
for (Integer v : linkedList) sum += v;
System.out.println("LinkedList took " + (System.nanoTime() - t0));
// Measures interpreter + JIT compilation + class loading + one noisy run. Meaningless.
```

```java
// 2. Holding millions of numbers boxed when a primitive array would do
Map<Long, List<Double>> readingsBySensor = ...;   // every reading is a Double object + list slot
```

The first produces numbers that look precise and are not. The second multiplies memory by roughly 3–4× compared with primitives (a `Double` is 24 bytes in the model above — 12-byte header + 8-byte value, padded — plus a 4-byte reference, versus 8 bytes in a `double[]`) and increases GC work.

## 11. Correct Implementation

Measure with JMH, which handles warm-up, forks, dead-code elimination and statistics:

```java title="java-examples/src/jmh/java/dev/handbook/jmh/ListIterationBenchmark.java (excerpt)"
@Benchmark
public long iterateLinkedList() {
    long sum = 0;
    for (Integer value : linkedList) {
        sum += value;
    }
    return sum; // returning the result prevents dead-code elimination
}
```

Store bulk numeric data in primitive form where the API allows it:

```java
double[] readings = new double[count];                 // 8 bytes per reading, one object
DoubleSummaryStatistics stats = Arrays.stream(readings).summaryStatistics(); // no boxing
```

For maps keyed by primitives at very large scale, primitive-specialised collection libraries exist outside the JDK; adopt them only after measuring that boxing is a real cost.

## 12. Enterprise Use Case

A risk engine loads 30 million `(accountId, exposure)` pairs into `Map<Long, BigDecimal>`. A quick model: each entry needs a `HashMap.Node` (32 B), a `Long` (24 B: 12-byte header + 8-byte value), a `BigDecimal` (tens of bytes plus its internal fields) and a table slot — easily over 100 bytes per entry, i.e. several gigabytes, before the application does any work. Options a senior engineer would evaluate, in order:

1. **Do less in memory** — push aggregation into the database or process the data in chunks.
2. **Change representation** — store exposures as `long` minor units in parallel primitive arrays sorted by account id and use binary search (O(log n) lookup, a fraction of the memory).
3. **Measure** with a heap histogram (`jcmd <pid> GC.class_histogram`) and JMH before and after.

The point is not "never use `HashMap`" — it is that at tens of millions of entries, bytes-per-element dominates the design.

## 13. Alternatives and Trade-offs

- **Primitive arrays / streams** (`int[]`, `IntStream`): smallest and fastest for numeric data; no `null`, no generic APIs.
- **`ArrayList`**: compact reference array, good locality for the references; elements are still separate objects.
- **`ArrayDeque`** instead of `LinkedList` for queues and stacks: array-backed, fewer objects.
- **Records and value-oriented design**: records reduce boilerplate but are still heap objects today; Project Valhalla (value classes) is not part of Java 25.
- **Off-heap / columnar storage**: for very large datasets, but with significant complexity.

## 14. Edge Cases

- **Small collections:** for a few dozen elements, everything fits in cache and differences vanish; choose for clarity.
- **Cached boxes:** values in −128..127 share `Integer` objects, so models based on "one object per element" overestimate memory for small values.
- **Large heaps:** above roughly 32 GB, HotSpot disables compressed oops by default and references become 8 bytes, which can *increase* memory use when the heap grows.
- **JIT effects:** escape analysis can sometimes eliminate boxing in tight loops; do not assume it will.
- **Benchmark validity:** results are specific to hardware, JVM version and flags. Report them with that context or not at all.

## 15. Interview Questions

**Q1. Why can iterating a LinkedList be slower than an ArrayList even though both are O(n)?**

<details><summary>Answer</summary>

Each `LinkedList` step loads a node whose address depends on the previous load (pointer chasing), defeating prefetching and cache-line reuse; nodes are separate objects with headers, so fewer useful bytes fit in each cache line. `ArrayList` reads its references sequentially from one array. Both still dereference element objects. The exact ratio must be measured; it varies with hardware and heap layout. *Misconception:* "LinkedList is faster for iteration because it doesn't need indexes."

</details>

**Q2. Estimate the memory of `ArrayList<Integer>` with one million distinct large values.**

<details><summary>Answer</summary>

On 64-bit HotSpot with compressed oops: about 4 MB for the reference array plus 16 MB of `Integer` objects — roughly 20 bytes per element, versus 4 bytes for `int[]`. State the assumptions (header size, reference size, alignment, no caching) and suggest JOL to verify.

</details>

**Q3. What is wrong with measuring performance using a single `System.nanoTime()` loop?**

<details><summary>Answer</summary>

It mixes interpreted and JIT-compiled execution, includes warm-up and class loading, is vulnerable to dead-code elimination and constant folding, has no statistical repetition, and is affected by GC and OS noise. JMH addresses these with warm-up iterations, forks, blackholes and statistics.

</details>

**Q4. Does the Java specification say an object header is 12 bytes?**

<details><summary>Answer</summary>

No. The JLS and JVM specification do not define object layout. 12-byte headers and 4-byte references are HotSpot implementation details under default settings on 64-bit platforms with compressed oops; JDK 25 can use 8-byte compact headers via `-XX:+UseCompactObjectHeaders`.

</details>

## 16. Practice Exercise

Using the same model as `MemoryFootprintModel`, estimate the memory for storing 10 million order IDs (positive `long` values, all distinct and large) as (a) `long[]`, (b) `ArrayList<Long>` trimmed to size, (c) `HashSet<Long>`. Assume a `Long` is 24 bytes (12-byte header + 8-byte value), a `HashMap.Node` 32 bytes, and the `HashSet` table has 2²⁴ slots. Which would you pick for "is this ID present?" checks?

<details><summary>Solution</summary>

(a) `long[]`: 16 + 8 × 10⁷ ≈ **80 MB**.
(b) `ArrayList<Long>`: references 4 × 10⁷ ≈ 40 MB + `Long`s 24 × 10⁷ = 240 MB ⇒ **≈ 280 MB**.
(c) `HashSet<Long>`: table 4 × 2²⁴ ≈ 67 MB + nodes 32 × 10⁷ = 320 MB + `Long`s 240 MB ⇒ **≈ 627 MB** (plus the small `HashSet`/`HashMap` objects; `HashSet` stores a shared dummy value, so no per-entry value object).

For membership checks: a **sorted `long[]` with `Arrays.binarySearch`** gives O(log n) lookups at ~80 MB; the `HashSet` gives O(1) expected lookups at roughly 8× the memory. If lookups are extremely frequent and memory is plentiful, the `HashSet` may still win — measure.

</details>

## 17. Key Takeaways

- Big O counts operations; **memory layout decides the constants**.
- Arrays give sequential access and prefetching; linked structures pay for pointer chasing.
- On HotSpot (default 64-bit), think 12-byte headers, 4-byte references, 8-byte alignment — and say that these are implementation details.
- Boxed collections cost several times the memory of primitives and create GC work.
- **Never publish or trust a performance claim without a proper benchmark** (JMH) and its environment.

## 18. Official References

- [JLS §5.1.7 Boxing Conversion (Java SE 25)](https://docs.oracle.com/javase/specs/jls/se25/html/jls-5.html#jls-5.1.7)
- [JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)
- [OpenJDK JMH (Java Microbenchmark Harness)](https://github.com/openjdk/jmh)
- [OpenJDK JOL (Java Object Layout)](https://github.com/openjdk/jol)
- [`java.lang.Integer#valueOf(int)` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Integer.html#valueOf(int))
