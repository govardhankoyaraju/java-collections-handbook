## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Developers new to Java often ask why they cannot pass a `Map` to a method that takes a `Collection`, why `map.forEach` exists but `for (x : map)` does not compile, and why `map.keySet().remove(k)` changes the map. Experienced developers then trip over the consequences in production: a `ConcurrentModificationException` while cleaning a cache inside a loop, a double lookup on every iteration (`for (k : keySet()) map.get(k)`), or an attempt to `add` to `keySet()`.

All of these follow from one design decision: **a map is not a collection, but it offers collection views of itself.**

## 3. Beginner-Friendly Explanation

A `Collection` is a bag of *things*. A `Map` is a *lookup table*: each key leads to one value. You could pretend a map is a bag of (key, value) pairs, but then the most important question — "what is the value for this key?" — would not fit the bag's vocabulary.

So Java keeps `Map` separate, and instead lets you look at it through three windows:

- `keySet()` — the keys, as a `Set` (keys are unique),
- `values()` — the values, as a `Collection` (values may repeat),
- `entrySet()` — the pairs, as a `Set<Map.Entry<K, V>>`.

These are **windows, not copies**: remove something through a window and it disappears from the map.

## 4. Detailed Technical Explanation

### The design rationale

The Collections Framework design FAQ answers "Why doesn't Map extend Collection?" directly: mappings are not collections and collections are not mappings. If a `Map` were a `Collection`, its elements would have to be key-value pairs, which gives a poor abstraction — you could not ask for the value of a key, nor remove the entry for a key without knowing its value. And `Collection` methods like `add(E)` make little sense for a map (add *what*, under which key?). The FAQ notes that maps can be *viewed* as collections of keys, values or pairs, and that is exactly what the view methods provide.

### The map interfaces

| Interface | Adds | Implementations |
|---|---|---|
| `Map<K,V>` | `get`, `put`, `remove`, `containsKey/Value`, `getOrDefault`, `putIfAbsent`, `compute*`, `merge`, `replaceAll`, `forEach`, views, `Map.of`, `Map.entry`, `copyOf` | `HashMap`, `LinkedHashMap`, `TreeMap`, `EnumMap`, `IdentityHashMap`, `WeakHashMap`, `ConcurrentHashMap`, `Hashtable` |
| `SequencedMap<K,V>` (21+) | encounter order: `firstEntry`, `lastEntry`, `pollFirstEntry`, `putFirst`, `reversed`, sequenced views | `LinkedHashMap`, all `SortedMap`s |
| `SortedMap<K,V>` | key order: `firstKey`, `lastKey`, `headMap`, `tailMap`, `subMap`, `comparator()` | `TreeMap`, `ConcurrentSkipListMap` |
| `NavigableMap<K,V>` | `lowerKey`, `floorKey`, `ceilingKey`, `higherKey` (+ `Entry` variants), `descendingMap`, inclusive/exclusive range views | `TreeMap`, `ConcurrentSkipListMap` |

### Views are backed by the map

> [!CONTRACT]
> `keySet()`, `values()` and `entrySet()` return views "backed by the map, so changes to the map are reflected in the set, and vice-versa". The views support removal (`remove`, `removeAll`, `retainAll`, `clear`, `removeIf`, `Iterator.remove`), which removes the corresponding mappings. They do **not** support `add` or `addAll`. If the map is modified while an iteration over a view is in progress (except through the iterator's own `remove`, or `setValue` on an entry returned by the iterator), the results of the iteration are undefined.

`Map.Entry.setValue` on an entry obtained by iterating `entrySet()` writes the new value into the map (for modifiable maps).

### Iteration patterns

```java
for (Map.Entry<String, Integer> e : map.entrySet()) { use(e.getKey(), e.getValue()); } // one pass
map.forEach((k, v) -> use(k, v));                                                         // same, internal iteration
for (String k : map.keySet()) { use(k, map.get(k)); }                                     // a lookup per key
```

The third form performs an extra hash (or tree) lookup per key. It is correct but wasteful; for `TreeMap` it turns an O(n) walk into O(n log n).

### `Map.Entry` instances

- Entries from iterating a modifiable map's `entrySet()` are connected to the map during iteration.
- `Map.entry(k, v)` (Java 9+) creates an **unmodifiable** entry that rejects null keys and values.
- `new AbstractMap.SimpleEntry<>(k, v)` is a mutable, standalone entry.
- `Map.Entry.copyOf(e)` (Java 17+) makes an unmodifiable, disconnected copy.

## 5. Internal Implementation

> [!IMPL]
> In OpenJDK, `HashMap.keySet()` returns an instance of the inner class `HashMap.KeySet`, created lazily and cached in a field, whose methods delegate to the map: `size()` returns the map's size, `contains(o)` calls `containsKey(o)`, `remove(o)` calls `removeNode(...)`, and its iterator walks the same bucket table as the map's own iteration. No keys are copied. `TreeMap.keySet()` returns a `KeySet` view that navigates the tree. That is why views cost O(1) to obtain and always reflect the current map.

`Map.forEach` and `Map.replaceAll` are default methods on `Map`; `HashMap` overrides them to walk its table directly and to check its `modCount` afterwards, throwing `ConcurrentModificationException` if the action modified the map.

## 6. Memory Representation

```text
TreeMap stock  ──────────────────────────────┐
  (apple=12) (cherry=7) (elder=3)            │  the only copy of the data
       ▲            ▲           ▲            │
       │            │           │            │
 keySet() view  values() view  entrySet() view   ← small objects that delegate
 "apple,cherry,  "12,7,3"      "apple=12,…"      to the map; no element copies
  elder"
```

## 7. Runnable Java Example

```example
m03/MapViewsTour
```

## 8. Execution Walkthrough

1. A `TreeMap` keeps keys sorted so the output is deterministic. The three views are obtained once.
2. `stock.put("elder", 3)` is immediately visible through `keys` — the view was created *before* the put.
3. `values.removeIf(q -> q == 0)` removes `banana` and `damson` **from the map** — removal through a view removes mappings.
4. `e.setValue(e.getValue() * 10)` during iteration of `entries` writes through: the map becomes `{apple=120, cherry=70, elder=30}`.
5. `keys.add("fig")` throws `UnsupportedOperationException`: a key alone is not a mapping.
6. Removing `apple` with `stock.remove(key)` *inside* a for-each over `keys` makes the next `next()` throw `ConcurrentModificationException`.
7. `ceilingKey("c")` returns the smallest key ≥ `"c"` (`cherry`); `headMap("d")` is a live view of keys < `"d"`.

## 9. Complexity Analysis

| Operation | `HashMap` | `TreeMap` |
|---|---|---|
| obtaining `keySet()`/`values()`/`entrySet()` | O(1) | O(1) |
| `keySet().contains(k)` | O(1) expected | O(log n) |
| `values().contains(v)` | O(capacity + n) | O(n) |
| iterate `entrySet()` | O(capacity + n) | O(n) |
| iterate `keySet()` + `get` each | O(capacity + n) expected | **O(n log n)** |
| `entrySet().removeIf(p)` | O(capacity + n) | O(n) plus removal costs |

`values().contains` is a linear scan in every map: maps index keys, not values.

## 10. Incorrect Implementation

```java
// Remove expired sessions — throws ConcurrentModificationException (or worse, under concurrency)
for (String id : sessions.keySet()) {
    if (sessions.get(id).isExpired(now)) {   // extra lookup per key, too
        sessions.remove(id);                 // structural change outside the iterator
    }
}
```

## 11. Correct Implementation

```java
sessions.values().removeIf(s -> s.isExpired(now));           // one pass, removal through the view

// or, when the key is needed for the decision:
sessions.entrySet().removeIf(e -> e.getValue().isExpired(now) && !pinned.contains(e.getKey()));

// or explicitly with an iterator:
for (Iterator<Map.Entry<String, Session>> it = sessions.entrySet().iterator(); it.hasNext(); ) {
    if (it.next().getValue().isExpired(now)) it.remove();
}
```

All three remove through the view, keeping the iterator consistent. Note: for a map shared between threads none of these is safe on a `HashMap` — use `ConcurrentHashMap`, whose views have weakly consistent iterators and allow concurrent removal.

## 12. Enterprise Use Case

**Price list with effective dates.** A pricing service stores `NavigableMap<LocalDate, BigDecimal>` per product — effective date → price. To price an order dated `d`, it needs the price in effect on that date: the entry with the greatest date ≤ `d`.

```java
BigDecimal priceOn(NavigableMap<LocalDate, BigDecimal> history, LocalDate day) {
    Map.Entry<LocalDate, BigDecimal> e = history.floorEntry(day);   // O(log n)
    if (e == null) throw new IllegalStateException("No price effective on " + day);
    return e.getValue();
}
```

A `HashMap` cannot answer "greatest key ≤ d" without scanning every key. The same structure supports "all price changes in Q3" with `subMap(start, true, end, true)` — a live view, not a copy.

## 13. Alternatives and Trade-offs

- **`List<Pair>` instead of a `Map`:** keeps duplicates and order but loses O(1)/O(log n) lookup; fine for small, append-only data such as HTTP headers.
- **`Map<K, List<V>>` (multimap):** when a key may have many values; build it with `computeIfAbsent(k, x -> new ArrayList<>()).add(v)`.
- **Views vs copies:** `new ArrayList<>(map.values())` gives a stable snapshot; the view gives O(1) access to the live data.
- **Records as entries:** for data transfer, a `record PriceChange(LocalDate from, BigDecimal price)` list is often clearer than exposing `Map.Entry`.

## 14. Edge Cases

- **`values()` is not a `Set`:** it may contain duplicates; `values().remove(v)` removes only the first mapping found with that value.
- **`get` returning `null`** is ambiguous for maps that allow null values; use `containsKey` or `getOrDefault`.
- **Views of unmodifiable maps** are unmodifiable too.
- **`IdentityHashMap` views compare with `==`**, not `equals`, deliberately violating the general `Set` contract (its Javadoc says so); do not pass them to code that assumes equals-based membership.
- **Range views of `TreeMap`** throw `IllegalArgumentException` if you insert a key outside the range through them.
- **`Map.of(...)` iteration order** is unspecified and deliberately randomized between JVM runs in OpenJDK; never depend on it.

## 15. Interview Questions

**Q1. Why doesn't `Map` extend `Collection`?**

<details><summary>Answer</summary>

Because a map's essential operation — looking up a value by key — does not fit the `Collection` abstraction. As a collection of pairs it would lose key-based lookup and removal, and `add(E)` has no sensible meaning. Instead `Map` provides collection *views* (`keySet`, `values`, `entrySet`) so collection algorithms can still be applied.

</details>

**Q2. What happens when you call `map.keySet().remove("x")`?**

<details><summary>Answer</summary>

The mapping for `"x"` is removed from the map, because the key set is a view backed by the map. It returns `true` if a mapping was removed.

</details>

**Q3. Which is better: iterating `keySet()` and calling `get`, or iterating `entrySet()`?**

<details><summary>Answer</summary>

`entrySet()` (or `forEach`): one pass, no extra lookups. With `keySet()` + `get` you pay an additional lookup per key — O(1) expected for `HashMap` but O(log n) for `TreeMap`, making the whole loop O(n log n).

</details>

**Q4. Are `Map.Entry` objects safe to keep after iteration?**

<details><summary>Answer</summary>

Not in general. Entries from iterating a modifiable map are only guaranteed to be connected to the map during the iteration; behaviour afterwards is unspecified (the `SequencedMap` Javadoc says so explicitly). Copy what you need, or use `Map.Entry.copyOf(e)` (Java 17+) for a disconnected, unmodifiable entry.

</details>

## 16. Practice Exercise

Given `Map<String, Integer> stockBySku`, write code that (a) removes all SKUs with zero stock, (b) doubles the stock of SKUs starting with `"PROMO-"`, and (c) returns the SKUs with stock below 5 in sorted order — in as few passes as reasonable, without `ConcurrentModificationException`.

<details><summary>Solution</summary>

```java
static SortedSet<String> housekeeping(Map<String, Integer> stockBySku) {
    stockBySku.values().removeIf(q -> q == 0);                          // (a) through the view
    stockBySku.replaceAll((sku, q) -> sku.startsWith("PROMO-") ? q * 2 : q); // (b) bulk update, no structural change
    SortedSet<String> low = new TreeSet<>();
    stockBySku.forEach((sku, q) -> { if (q < 5) low.add(sku); });      // (c) collect separately
    return low;
}
```

(b) and (c) can be merged into one `forEach` over `entrySet()` using `e.setValue(...)`; keeping them separate is clearer. `replaceAll` is not a structural modification, so it does not invalidate iterators of other code — but it still must not run concurrently with other threads on a `HashMap`.

</details>

## 17. Key Takeaways

- `Map` is a separate root of the hierarchy by design; it is not a `Collection` or `Iterable`.
- `keySet()`, `values()`, `entrySet()` are **live views**: removal through them changes the map; adding is unsupported.
- Iterate `entrySet()`/`forEach`, not `keySet()` + `get`.
- Remove during iteration only through the view (`removeIf`, `Iterator.remove`).
- `SortedMap`/`NavigableMap` add ordered navigation and range views; `SequencedMap` (21+) adds first/last and `reversed()`.

## 18. Official References

- [Java Collections API Design FAQ — "Why doesn't Map extend Collection?"](https://docs.oracle.com/javase/8/docs/technotes/guides/collections/designfaq.html)
- [`java.util.Map` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html)
- [`java.util.NavigableMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/NavigableMap.html)
- [`java.util.SequencedMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedMap.html)
- [`java.util.Map.Entry` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.Entry.html)
