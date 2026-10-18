## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Java arrays have a fixed length chosen at creation. Business data rarely does: you do not know how many order lines a file contains until you have read it. Before the Collections Framework, every project re-implemented "an array that grows" — with subtle bugs in growth policies, index checks and memory leaks from forgotten references.

`ArrayList` is the JDK's answer: a **resizable array** with the `List` interface on top. It is the most used collection in Java, and most of its performance characteristics — fast indexing, cheap appends, expensive insertion at the front, occasional large copies — follow directly from a handful of lines of code. Knowing those lines lets you predict its behaviour instead of guessing.

## 3. Beginner-Friendly Explanation

An `ArrayList` holds a normal Java array internally, usually with some empty slots at the end.

- **Size** = how many elements you have added.
- **Capacity** = how many slots the internal array has.

Adding to the end fills the next empty slot. When there are no empty slots left, `ArrayList` creates a **bigger array** (about 50% bigger), copies everything across, and continues. Inserting in the middle means sliding every later element one slot to the right; removing means sliding them left. Reading `get(5)` simply looks in slot 5.

Try it: add elements, insert at index 0, remove, and watch the capacity grow.

```viz
arraylist
```

## 4. Detailed Technical Explanation

### State

```java title="OpenJDK 25 · java.util.ArrayList (fields, simplified)"
private static final int DEFAULT_CAPACITY = 10;
private static final Object[] EMPTY_ELEMENTDATA = {};                 // for new ArrayList<>(0)
private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};  // for new ArrayList<>()
transient Object[] elementData;   // the backing array; its length is the capacity
private int size;                 // number of elements actually stored
// inherited from AbstractList: protected transient int modCount
```

### Constructors

| Constructor | Initial `elementData` | First `add` |
|---|---|---|
| `new ArrayList<>()` | shared empty array (`DEFAULTCAPACITY_EMPTY_ELEMENTDATA`) | allocates **10** slots |
| `new ArrayList<>(n)`, n > 0 | `new Object[n]` | uses the existing array |
| `new ArrayList<>(0)` | shared empty array (`EMPTY_ELEMENTDATA`) | grows to **1**, then 2, 3, 4, 6, 9… |
| `new ArrayList<>(collection)` | `collection.toArray()` (copied if needed) | grows by 50% |

The two distinct empty arrays exist precisely so that the default constructor can be lazy *and* still jump straight to 10 on first use.

> [!CONTRACT]
> The Javadoc guarantees: `size`, `isEmpty`, `get`, `set`, `iterator` and `listIterator` run in constant time; `add` runs in **amortized** constant time; other operations run in linear time (roughly). "The details of the growth policy are not specified beyond the fact that adding an element has constant amortized time cost." Everything about 10 slots and 50% growth below is OpenJDK implementation detail.

### Growth

```java title="OpenJDK 25 · ArrayList.grow(int minCapacity)"
private Object[] grow(int minCapacity) {
    int oldCapacity = elementData.length;
    if (oldCapacity > 0 || elementData != DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        int newCapacity = ArraysSupport.newLength(oldCapacity,
                minCapacity - oldCapacity, /* minimum growth */
                oldCapacity >> 1           /* preferred growth */);
        return elementData = Arrays.copyOf(elementData, newCapacity);
    } else {
        return elementData = new Object[Math.max(DEFAULT_CAPACITY, minCapacity)];
    }
}
```

`ArraysSupport.newLength(old, minGrowth, prefGrowth)` returns `old + max(minGrowth, prefGrowth)` unless that exceeds `Integer.MAX_VALUE − 8` (the "soft maximum"), in which case it returns the minimum length that fits or throws `OutOfMemoryError`. For a single `add`, `minGrowth` is 1 and `prefGrowth` is `old >> 1`, so capacity grows by 50% (rounded down): **10 → 15 → 22 → 33 → 49 → 73 → 109 …**

### Positional operations

- `get(i)` / `set(i, e)`: `Objects.checkIndex(i, size)`, then one array access.
- `add(e)`: `modCount++`; if `size == elementData.length` grow; store at `elementData[size]`; `size++`.
- `add(i, e)`: range check (`0 ≤ i ≤ size`), `modCount++`, grow if full, then `System.arraycopy(elementData, i, elementData, i + 1, size − i)` and store.
- `remove(i)`: `Objects.checkIndex`, then `fastRemove`: `System.arraycopy(es, i + 1, es, i, size − 1 − i)` and **`es[--size] = null`** so the removed reference can be garbage-collected.
- `remove(Object o)`: linear search with `equals` (or `== null`), then `fastRemove`.

### Bulk and capacity operations

- `addAll(c)`: calls `c.toArray()` once and grows **once** to `max(needed, 1.5 × old)` before a single `System.arraycopy`.
- `ensureCapacity(min)`: grows if `min` exceeds the capacity — except for a pristine default list with `min ≤ 10`, where it is a no-op because the first add will allocate 10 anyway.
- `trimToSize()`: replaces the array with an exactly sized copy (or the shared empty array when size is 0).
- `removeIf(p)` / `removeAll` / `retainAll`: a single compaction pass, O(n), regardless of how many elements are removed.
- `clear()`: nulls out every slot up to `size`; capacity is kept.

## 5. Internal Implementation

### Iteration and fail-fast

The iterator (`ArrayList.Itr`) keeps a `cursor`, the index of the last returned element `lastRet`, and `expectedModCount`. Every `next()` first checks `modCount == expectedModCount` and throws `ConcurrentModificationException` otherwise. `Iterator.remove()` calls `ArrayList.this.remove(lastRet)`, then sets `cursor = lastRet` and refreshes `expectedModCount` — which is why removing *through* the iterator is safe and removing *through the list* is not.

`hasNext()` is simply `cursor != size` and does **not** check `modCount`. If you remove the second-to-last element inside a for-each loop, `size` drops to equal `cursor`, `hasNext()` returns `false` and the loop ends without an exception — silently skipping the last element. Fail-fast is best-effort.

### Element shifting

`System.arraycopy` is an intrinsic: HotSpot replaces it with highly optimised copy routines. Shifting is still O(n) — just with a small constant. Reference arrays also need GC card marking for the stored references, a cost hidden from the Java code.

### Serialization

`elementData` is `transient`; `writeObject` writes only `size` elements, so serialized form does not include empty capacity.

## 6. Memory Representation

```text
ArrayList (24 B header + fields, HotSpot model)
┌──────────────┬─────────┬──────────────┐
│ modCount = 7 │ size = 5│ elementData ●┼──┐
└──────────────┴─────────┴──────────────┘  │
                                           ▼
Object[] length 10:  [● ][● ][● ][● ][● ][null][null][null][null][null]
                      │   │   │   │   │
                      ▼   ▼   ▼   ▼   ▼     elements live elsewhere on the heap
                     "A" "B" "C" "D" "E"

remove(1):  System.arraycopy shifts C, D, E left; slot 4 set to null; size = 4
add(1, X):  shifts B.. right by one; writes X at index 1; may first grow the array
```

Per element, an `ArrayList` costs one reference slot (4 bytes with compressed oops) plus unused capacity — up to a third of the array right after a 50% growth step.

## 7. Runnable Java Example

The first program observes the real backing array of a JDK 25 `ArrayList` (by reflection — see the note in its Javadoc) and compares it with a pure-Java model of the growth rule:

```example
m05/ArrayListGrowthDemo
m05/ArrayListGrowthModel
```

The second program shows the classic removal bugs and two correct alternatives:

```example
m05/ListRemovalPitfalls
```

## 8. Execution Walkthrough

**`ArrayListGrowthDemo`**

1. A fresh `new ArrayList<>()` has capacity **0** — no array is allocated until it is needed.
2. Adding 50 elements passes through capacities **10, 15, 22, 33, 49, 73**, exactly what `ArrayListGrowthModel` predicts. (`ListExamplesTest.growthModelMatchesRunningJdk` checks the model against the JDK for 5,000 appends and four constructors.)
3. `trimToSize()` shrinks the array from 73 to exactly 50.
4. `ensureCapacity(51)` on a 50-slot array grows to **75**, not 51: growth is `max(needed, 50%)`.
5. `new ArrayList<>(1000)` followed by 1,000 adds never resizes.
6. `new ArrayList<>(0)` grows **1, 2, 3, 4, 6, 6**: with an explicit zero capacity there is no jump to 10, and 50% of a tiny array rounds down to nothing, so the minimum growth of 1 applies.
7. Appending 1,000,000 elements from a default list copies 2,430,972 references in total — about 2.4 per element, the amortized constant.

**`ListRemovalPitfalls`**

1. The index loop removes `INV-2`; `INV-3` shifts into index 1; `i++` moves to index 2 and `INV-3` is never examined. Result: `[INV-1, INV-3, INV-4]` — a wrong answer, no exception.
2. The for-each version removes `INV-2` through the list; the iterator's next `next()` sees `modCount` changed and throws `ConcurrentModificationException`.
3. `Iterator.remove()` and `removeIf` both produce `[INV-1, INV-4]`. `removeIf` does it in one compaction pass.

## 9. Complexity Analysis

| Operation | Time | Notes |
|---|---|---|
| `get(i)`, `set(i, e)` | O(1) | bounds check + array access |
| `add(e)` | O(1) amortized; O(n) when it resizes | copies `size` references on resize |
| `add(i, e)` | O(n − i) (+ resize) | `System.arraycopy` of the tail |
| `remove(i)` | O(n − i) | shift left, null last slot |
| `remove(Object)`, `contains`, `indexOf` | O(n) | linear `equals` scan |
| `addAll(c)` | O(m) amortized for appending m elements; O(n + m) for `addAll(i, c)` | one growth step |
| `removeIf(p)` | O(n) | single pass, even when removing many |
| removing k elements with `Iterator.remove` | O(k · n) worst case | each removal shifts the tail |
| `trimToSize`, `ensureCapacity` (when growing) | O(n) | array copy |
| iteration | O(n) | sequential access to the reference array |

Space: O(capacity) references, where capacity ≤ about 1.5 × size after growth (unless trimmed or pre-sized larger).

## 10. Incorrect Implementation

```java
// 1. Front-of-list processing: O(n²)
while (!batch.isEmpty()) {
    process(batch.remove(0));
}

// 2. Building a large list without a known size hint when the size IS known
List<Row> rows = new ArrayList<>();            // ~30 resizes for 1M rows, ~2.4M reference copies
for (int i = 0; i < resultSet.size(); i++) rows.add(map(resultSet.get(i)));

// 3. Long-lived list that once held millions of elements
List<Event> buffer = loadDay();                 // 5M events
buffer.removeIf(e -> !e.isError());             // 5K remain, capacity still ~5M slots (~20 MB)
cache.put(day, buffer);
```

## 11. Correct Implementation

```java
// 1. Use a deque for FIFO processing
Deque<Job> batch = new ArrayDeque<>(jobs);
while (!batch.isEmpty()) process(batch.pollFirst());

// 2. Pre-size when the count is known
List<Row> rows = new ArrayList<>(resultSet.size());

// 3. Release excess capacity before caching — or copy into an exactly sized immutable list
List<Event> errors = loadDay().stream().filter(Event::isError).toList();
cache.put(day, errors);
// (or: buffer.removeIf(...); buffer.trimToSize();)
```

Why they are valid: `ArrayDeque.pollFirst` is O(1); pre-sizing eliminates every resize; `toList()` allocates an array sized to the result, so no excess capacity is retained by the cache.

## 12. Enterprise Use Case

**Paginated export.** A reporting endpoint loads 50,000 invoice rows per page from a database and maps them to DTOs.

```java
public List<InvoiceDto> page(int pageSize) {
    List<InvoiceEntity> entities = repository.findPage(pageSize); // driver returns a List
    List<InvoiceDto> dtos = new ArrayList<>(entities.size());     // exact size, zero resizes
    for (InvoiceEntity e : entities) {
        dtos.add(mapper.toDto(e));
    }
    return Collections.unmodifiableList(dtos);                    // O(1) wrapper; dtos never escapes
}
```

Engineering notes:

- Pre-sizing removes transient arrays from every request — less allocation pressure under load.
- `Collections.unmodifiableList` is an O(1) view; it is safe here because the method never retains `dtos`.
- If rows must be filtered in Java, prefer one `removeIf` pass (or a stream filter) over repeated `remove(i)` calls.
- If pages are processed in order and discarded, consider streaming (cursor-based) instead of materialising lists at all.

## 13. Alternatives and Trade-offs

- **Plain arrays**: no boxing for primitives, fixed size, no `List` API. Use for fixed-size numeric data.
- **`ArrayDeque`**: O(1) at both ends; no index access. Use for queues and stacks.
- **`LinkedList`**: O(1) insertion/removal at a position you already hold via a `ListIterator`; poor locality and high per-element overhead — see the [next lesson](/learn/lists/arraylist-vs-linkedlist).
- **`CopyOnWriteArrayList`**: thread-safe, snapshot iteration, O(n) per write; for read-mostly shared lists.
- **`List.of` / `List.copyOf` / `Stream.toList()`**: exactly sized, unmodifiable results for API boundaries.

## 14. Edge Cases

- **`IndexOutOfBoundsException`**: `get(size)` fails; `add(size, e)` is legal (appends).
- **`remove(int)` vs `remove(Object)`** on `List<Integer>`: `list.remove(1)` removes *index* 1; `list.remove(Integer.valueOf(1))` removes the *value* 1.
- **Nulls are allowed** and `contains(null)`/`indexOf(null)` work.
- **`subList` is a view**: structural changes to the parent invalidate it (`ConcurrentModificationException` on next use).
- **Capacity is not observable** through the API; only behaviour and memory reveal it. The reflection used in the demo requires `--add-opens java.base/java.util=ALL-UNNAMED` and must never appear in production code.
- **Maximum size**: near `Integer.MAX_VALUE − 8` elements growth falls back to the minimum required length; beyond `Integer.MAX_VALUE` it throws `OutOfMemoryError` ("Required array length too large").
- **Removing the second-to-last element in a for-each** does not throw and skips the last element.

## 15. Interview Questions

**Q1. What happens, step by step, when `add` is called on a full `ArrayList` of capacity 10?**

<details><summary>Answer</summary>

`modCount` is incremented; `size == elementData.length`, so `grow(size + 1)` computes `ArraysSupport.newLength(10, 1, 5) = 15`; `Arrays.copyOf` allocates a new `Object[15]` and copies the 10 references; `elementData` now points to the new array (the old one becomes garbage); the element is stored at index 10 and `size` becomes 11. Contract-wise only "amortized constant time" is guaranteed; the 1.5 factor is an OpenJDK detail.

</details>

**Q2. Why does `new ArrayList<>()` not allocate 10 slots immediately?**

<details><summary>Answer</summary>

Since JDK 7u40/8, the default constructor shares a static empty array and allocates 10 slots on the first add. Many lists in real applications stay empty, so lazy allocation saves memory. A separate sentinel array (`DEFAULTCAPACITY_EMPTY_ELEMENTDATA`) distinguishes "default constructed" from `new ArrayList<>(0)`, which grows from 1.

</details>

**Q3. Why is `removeIf` preferable to removing in a loop?**

<details><summary>Answer</summary>

Correctness: it avoids index-skipping bugs and `ConcurrentModificationException`. Performance: `ArrayList.removeIf` marks elements to remove and compacts the array in a single O(n) pass, whereas removing k elements one by one shifts the tail each time, O(k · n).

</details>

**Q4. Does `clear()` free the backing array's memory?**

<details><summary>Answer</summary>

No. It nulls the element slots (so elements can be collected) and sets size to 0, but the array keeps its capacity. Call `trimToSize()` or replace the list if the capacity itself should be released.

</details>

**Q5. Why does `fastRemove` set the last slot to `null`?**

<details><summary>Answer</summary>

After shifting, the old last slot still holds a reference to an element that is now also one slot earlier (or was removed). Leaving it would keep the object reachable — a memory leak ("obsolete reference"). Nulling it lets the GC reclaim objects removed from the list.

</details>

## 16. Practice Exercise

Starting from `new ArrayList<>()`, compute by hand the capacity after each of the following, using the OpenJDK growth rule. Then verify with the simulator above: Reset with `new ArrayList<>()` and use `add`, `addAll` (set the count), `ensureCapacity`, `remove(index)` with index 0, and `trimToSize()`.

1. 11 calls to `add`
2. then `addAll` of 30 elements
3. then `ensureCapacity(50)`
4. then 20 calls to `remove(0)`
5. then `trimToSize()`

<details><summary>Solution</summary>

1. First add allocates 10; the 11th add grows to 10 + max(1, 5) = **15**. (size 11)
2. `addAll` of 30 needs 41 > 15: grows once to 15 + max(26, 7) = **41**. (size 41)
3. `ensureCapacity(50)`: 50 > 41, grows to 41 + max(9, 20) = **61**. (size 41)
4. Removing never shrinks: capacity stays **61**. (size 21) Each `remove(0)` shifted the tail — 20 removals moved 40 + 39 + … + 21 = 610 references in total.
5. `trimToSize()`: capacity becomes **21**.

</details>

## 17. Key Takeaways

- `ArrayList` = `Object[] elementData` + `int size`; capacity is the array length.
- OpenJDK grows by 50% (`old + max(needed, old >> 1)`); default lists allocate 10 on first add. Only "amortized constant" is contractual.
- Index access is O(1); positional insert/remove shift the tail, O(n).
- Pre-size when you know the size; trim or copy before retaining a shrunken list.
- Remove with `removeIf` or `Iterator.remove`, never with index loops or list calls inside for-each.

## 18. Official References

- [`java.util.ArrayList` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayList.html)
- [OpenJDK 25 source: `ArrayList.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/ArrayList.java)
- [OpenJDK 25 source: `ArraysSupport.java` (`newLength`)](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/jdk/internal/util/ArraysSupport.java)
- [`java.util.Collection#removeIf`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Collection.html#removeIf(java.util.function.Predicate))
- [`java.lang.System#arraycopy`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/System.html#arraycopy(java.lang.Object,int,java.lang.Object,int,int))
