## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

`HashMap` iteration order is unspecified, which causes real defects: JSON responses whose field order changes between deployments, reports that do not match the order of the input file, flaky tests that compare printed maps. Meanwhile, many services need a small in-process **cache** with a size limit: keep the most recently used N entries, evict the least recently used one when full.

`LinkedHashMap` solves both with one idea: keep `HashMap`'s O(1) lookups, and additionally thread a **doubly linked list** through the entries that records either their insertion order or their access order. With access order and one overridden method, it becomes an LRU cache.

## 3. Beginner-Friendly Explanation

Imagine the cloakroom again, but now every coat also has a string tied to the coat hung just before it and the one hung just after it.

- In **insertion-order** mode, the string runs in the order coats arrived. To list all coats, follow the string from the first to the last — no need to look at empty hooks.
- In **access-order** mode, whenever a coat is fetched (or replaced), it is untied and re-tied at the **end** of the string. The coat at the **start** of the string is the one nobody has touched for the longest time — the *least recently used*.

An LRU cache just says: "after adding a coat, if there are more than N, throw away the coat at the start of the string."

## 4. Detailed Technical Explanation

### Structure

```java title="OpenJDK 25 · java.util.LinkedHashMap (fields, simplified)"
static class Entry<K,V> extends HashMap.Node<K,V> {
    Entry<K,V> before, after;          // the ordering links
}
transient LinkedHashMap.Entry<K,V> head;   // eldest
transient LinkedHashMap.Entry<K,V> tail;   // youngest
final boolean accessOrder;                 // false: insertion order (default); true: access order
```

`LinkedHashMap extends HashMap`: hashing, buckets, treeification and resizing are inherited unchanged. It overrides the node factory (`newNode`) to create `Entry` objects linked at the tail, and implements three hooks that `HashMap` calls: `afterNodeAccess`, `afterNodeInsertion` and `afterNodeRemoval`.

### Insertion order (default)

> [!CONTRACT]
> "This linked list defines the encounter order (the order of iteration), which is normally the order in which keys were inserted into the map (insertion-order)… Insertion order is not affected if a key is re-inserted into the map." Iteration over the collection views "requires time proportional to the size of the map, regardless of its capacity."

### Access order

Created with the three-argument constructor `new LinkedHashMap<>(initialCapacity, loadFactor, true)`. Order runs from least recently accessed to most recently accessed.

> [!CONTRACT]
> "Invoking the `put`, `putIfAbsent`, `get`, `getOrDefault`, `compute`, `computeIfAbsent`, `computeIfPresent`, or `merge` methods results in an access to the corresponding entry (assuming it exists after the invocation completes). The `replace` methods only result in an access of the entry if the value is replaced. The `putAll` method generates one entry access for each mapping in the specified map… **Operations on collection-views do not affect the order of iteration of the backing map.**" And: "In access-ordered linked hash maps, merely querying the map with `get` is a structural modification."

`containsKey` is not an access (verified in the examples' tests).

### Eviction hook

```java
protected boolean removeEldestEntry(Map.Entry<K,V> eldest)   // default: return false
```

`put` and `putAll` call it **after inserting a new mapping**, passing the eldest entry (the head). If it returns `true`, that entry is removed. Overriding it to `return size() > MAX` turns the map into a bounded cache. The method may also remove entries itself, but then must return `false`.

### Sequenced map (Java 21+)

`LinkedHashMap` implements `SequencedMap`: `firstEntry()`/`lastEntry()` (snapshots), `pollFirstEntry()`, `putFirst`/`putLast` (which reposition existing keys), `reversed()`, `sequencedKeySet()` and friends. Java 19 added `LinkedHashMap.newLinkedHashMap(int numMappings)`.

## 5. Internal Implementation

```java title="OpenJDK 25 · LinkedHashMap hooks (abridged)"
void afterNodeAccess(Node<K,V> e) {               // called on get/put-replace/compute… of an existing key
    // if access-ordered (or putLast) and e is not already the tail:
    //   unlink e from before/after, append it at the tail, ++modCount
}
void afterNodeInsertion(boolean evict) {          // called by putVal after a NEW mapping
    LinkedHashMap.Entry<K,V> first;
    if (evict && (first = head) != null && removeEldestEntry(first)) {
        K key = first.key;
        removeNode(hash(key), key, null, false, true);
    }
}
void afterNodeRemoval(Node<K,V> e) {              // unlink e from the ordering list
}
```

`get` in access-order mode calls `afterNodeAccess`, which **changes `modCount`** when it moves an entry — that is why a `get` inside a loop over the map's views throws `ConcurrentModificationException`.

Iteration (`LinkedHashIterator`) follows `after` links from `head`: no empty buckets are visited.

> [!IMPL]
> `putFirst(k, v)` (Java 21+) in OpenJDK 21–25 links a new entry at the head and then runs the same `afterNodeInsertion` eviction check, whose "eldest" is the head — the entry just inserted. On a size-bounded `LinkedHashMap`, `putFirst` of a new key therefore evicts that key immediately (demonstrated by the test `putFirstOnAnEvictingMapEvictsTheEntryJustInserted`). Avoid `putFirst` on evicting maps.

## 6. Memory Representation

```text
buckets (inherited from HashMap)           ordering list (before/after links)
[0] → Entry(c)                             head                                  tail
[3] → Entry(a) → Entry(x)                   │                                      │
[9] → Entry(b)                              ▼                                      ▼
                                          Entry(c) ⇄ Entry(a) ⇄ Entry(b) ⇄ Entry(x)

access order: get("a") unlinks a and relinks it at the tail:
                                          Entry(c) ⇄ Entry(b) ⇄ Entry(x) ⇄ Entry(a)

LinkedHashMap.Entry (HotSpot model): Node 28 B + before/after 8 B = 36 → 40 bytes
                                      (vs 32 bytes for a plain HashMap.Node)
```

## 7. Runnable Java Example

The cache class (a library class with no `main`; it is exercised by the demo and by `HashMapBehaviourTest`):

```example
m07/LruCache
m07/LruCacheDemo
```

## 8. Execution Walkthrough

1. **Insertion order:** inserting `c`, `a`, `b` and then re-putting `c` keeps `c` first — re-insertion does not move a key; `get("a")` does not move it either. Output `{c=30, a=1, b=2}`.
2. **Access order:** with `accessOrder = true`, `get("c")` moves `c` to the tail: `{a=1, b=2, c=3}`.
3. **LRU cache:** capacity 3; after inserting `user:1..3`, `get("user:1")` makes `user:1` most recently used. Inserting `user:4` triggers `removeEldestEntry`, which sees `size() == 4 > 3` and evicts the head, `user:2`. Final order `[user:3, user:1, user:4]`, one eviction, `user:2` is gone.
4. **Structural `get`:** iterating `access.keySet()` and calling `access.get(key)` moves the first key to the tail, increments `modCount`, and the iterator's next `next()` throws `ConcurrentModificationException`.
5. `LruCache.order()` reads `keySet()` — collection-view operations are **not** accesses, so printing the order does not change it.

## 9. Complexity Analysis

| Operation | Time | Notes |
|---|---|---|
| `get`, `put`, `remove`, `containsKey` | O(1) expected | as `HashMap`, plus O(1) relinking |
| eviction (`removeEldestEntry` → remove head) | O(1) expected | head is known; removal from bucket as `HashMap` |
| iteration | **O(n)**, independent of capacity | follows `after` links |
| `firstEntry`, `lastEntry`, `pollFirstEntry` | O(1) | head/tail |
| memory | ≈ 8 extra bytes per entry vs `HashMap` (model) | two links per entry |

## 10. Incorrect Implementation

```java
// 1. "LRU" cache that never evicts, or evicts in insertion order
Map<String, Price> cache = new LinkedHashMap<>(16, 0.75f);        // accessOrder defaults to false!
// removeEldestEntry not overridden → unbounded growth

// 2. Shared across request threads with no locking
static final Map<String, Price> CACHE = new LinkedHashMap<>(16, 0.75f, true) {
    @Override protected boolean removeEldestEntry(Map.Entry<String, Price> e) { return size() > 10_000; }
};
// Concurrent get() calls MOVE entries — reads corrupt the linked list just like writes.

// 3. Inspecting the cache while reading from it
for (String key : cache.keySet()) log(key, cache.get(key)); // CME in access-order mode
```

## 11. Correct Implementation

```java
// Single-threaded or externally synchronized LRU (see java-examples LruCache)
public final class LruCache<K, V> {
    private final int maxEntries;
    private final Map<K, V> map;

    public LruCache(int maxEntries) {
        if (maxEntries < 1) throw new IllegalArgumentException("maxEntries must be positive");
        this.maxEntries = maxEntries;
        this.map = new LinkedHashMap<>((int) Math.ceil(maxEntries / 0.75), 0.75f, true) {
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > LruCache.this.maxEntries;
            }
        };
    }
    public synchronized V get(K key) { return map.get(key); }       // synchronized: get is structural
    public synchronized void put(K key, V value) { map.put(key, value); }
}
```

Iterate with `entrySet()` (one pass, no `get`), synchronize **every** access including reads if shared, and size the table so it never resizes. (The java-examples `LruCache` is the unsynchronized, single-threaded version, documented as such.)

## 12. Enterprise Use Case

**Per-instance cache of rendered templates** in a service that renders a few hundred distinct e-mail templates. Requirements: bounded memory, recently used templates stay hot, simple, no new dependency.

- A synchronized `LruCache<TemplateKey, CompiledTemplate>` of 500 entries is sufficient: lookups are O(1), contention is low because rendering dominates, and eviction is deterministic and testable.
- Keys are records (`record TemplateKey(String name, Locale locale)`), immutable as hash keys must be.

When requirements grow — high concurrency, time-based expiry, refresh-ahead, hit-rate statistics, weight-based limits — a purpose-built caching library (or a distributed cache) is the better engineering choice; `LinkedHashMap`'s single global ordering list is inherently contended, because every read must update it.

**Deterministic API output.** Building a JSON response object as a `LinkedHashMap<String, Object>` (insertion order) makes field order stable and matches the order of construction — useful for readable responses and snapshot tests.

## 13. Alternatives and Trade-offs

| Need | Choice | Trade-off |
|---|---|---|
| Predictable iteration = insertion order | `LinkedHashMap` | ~8 extra bytes per entry |
| Sorted iteration | `TreeMap` | O(log n) operations |
| Concurrent LRU-ish cache | caching library | dependency; richer policies |
| Concurrent map, no eviction | `ConcurrentHashMap` | no ordering |
| Ordered set | `LinkedHashSet` (backed by a `LinkedHashMap`) | same ordering semantics, insertion order only |
| FIFO-bounded map (evict oldest *inserted*) | `LinkedHashMap` with insertion order + `removeEldestEntry` | not LRU |

## 14. Edge Cases

- **Constructor trap:** only the 3-argument constructor enables access order; the 2-argument one does not.
- **`get` is structural in access-order mode** → iterating while reading throws `ConcurrentModificationException`; and concurrent reads are unsafe.
- **Collection-view operations** (`keySet().contains`, iteration) do not count as accesses.
- **`replace(k, v)`** counts as an access only if the value was actually replaced.
- **Eviction on compute-family inserts:** in OpenJDK 25, `computeIfAbsent`, `compute` and `merge` also call `afterNodeInsertion` (and therefore `removeEldestEntry`) when they add a mapping, but the Javadoc documents the hook only for `put` and `putAll` — test before relying on eviction through other methods.
- **`putFirst` on an evicting map** evicts the new entry immediately (OpenJDK 21–25 behaviour).
- **Capacity 1 caches** work (tested in `lruCacheEdgeCases`).
- **Re-inserting an existing key** in insertion-order mode keeps its original position; in access-order mode it moves it to the tail.

## 15. Interview Questions

**Q1. How does LinkedHashMap maintain order without slowing down lookups?**

<details><summary>Answer</summary>

It inherits `HashMap`'s table for O(1) lookups and adds `before`/`after` links to each entry, forming a doubly linked list with `head` and `tail`. Linking a new entry at the tail, unlinking a removed one, or moving an accessed one are O(1) pointer updates performed in hook methods (`afterNodeInsertion`, `afterNodeRemoval`, `afterNodeAccess`).

</details>

**Q2. Implement an LRU cache with LinkedHashMap. What are its limitations?**

<details><summary>Answer</summary>

Use `new LinkedHashMap<>(cap, 0.75f, true)` and override `removeEldestEntry` to `return size() > max`. Limitations: not thread-safe (and `get` is a structural modification, so even reads need locking); a single lock or ordering list becomes a contention point under concurrency; no expiry or statistics; eviction is strictly LRU by count, not by size/weight.

</details>

**Q3. Does `get` change iteration order?**

<details><summary>Answer</summary>

Only in access-order mode, where `get` moves the entry to the tail and counts as a structural modification. In the default insertion-order mode, `get` changes nothing, and re-inserting an existing key does not change order either.

</details>

**Q4. What is the iteration cost of LinkedHashMap compared with HashMap?**

<details><summary>Answer</summary>

`LinkedHashMap` iterates its linked list: O(n), independent of capacity. `HashMap` iterates its table: O(capacity + n). For a map that has shrunk after holding many entries, the difference can be large.

</details>

## 16. Practice Exercise

Extend the LRU idea: implement a `RecentSearches` component that stores the last 10 **distinct** search terms of a user, most recent first, case-insensitively (searching "Java" after "java" moves it to the front instead of adding a duplicate). Provide `record(String term)` and `List<String> recentFirst()`.

<details><summary>Solution</summary>

```java
final class RecentSearches {
    private static final int MAX = 10;
    private final LinkedHashMap<String, String> terms =               // normalised → original spelling
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override protected boolean removeEldestEntry(Map.Entry<String, String> eldest) {
                    return size() > MAX;
                }
            };

    void record(String term) {
        String t = term.strip();
        if (t.isEmpty()) return;
        terms.put(t.toLowerCase(Locale.ROOT), t);                     // put of an existing key = access → moves to tail
    }

    List<String> recentFirst() {
        return List.copyOf(terms.sequencedValues().reversed());       // Java 21+: newest first, unmodifiable
    }
}
```

`put` on an existing key is an access in access-order mode, so the term moves to the tail and its latest spelling is stored. On Java 17, replace the last line with copying `values()` into an `ArrayList` and calling `Collections.reverse`.

</details>

## 17. Key Takeaways

- `LinkedHashMap` = `HashMap` + a doubly linked list (`before`/`after`, `head`/`tail`) through its entries.
- Default insertion order (re-insertion does not move); access order via the 3-argument constructor.
- In access order, `get` moves entries and is a **structural modification**.
- `removeEldestEntry` + access order = LRU cache in a few lines — single-threaded or externally synchronized.
- Iteration is O(n) regardless of capacity; memory is ~8 bytes per entry more than `HashMap` (model).

## 18. Official References

- [`java.util.LinkedHashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedHashMap.html) — access order, `removeEldestEntry`, structural modification.
- [`LinkedHashMap.newLinkedHashMap(int)` (since 19)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedHashMap.html#newLinkedHashMap(int))
- [`java.util.SequencedMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedMap.html)
- [OpenJDK 25 source: `LinkedHashMap.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/LinkedHashMap.java)
