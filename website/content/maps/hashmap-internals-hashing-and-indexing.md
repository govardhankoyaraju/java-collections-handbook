## 1. Learning Objectives

This is the first of four lessons that together cover all 29 points of the HashMap deep dive. This lesson covers points **1–6**: internal table structure, hash calculation, hash spreading, bucket indexing, key equality and node creation.

After this lesson you will be able to:

```objectives
```

## 2. The Problem

You need to find a customer's record by ID among millions, many thousands of times per second. A list scan is O(n). A sorted structure is O(log n). What you want is to **compute** where the record is from the key itself, and go straight there — O(1).

That is the idea of a hash table: turn the key into a number (its hash code), turn the number into an array index, and store the entry there. The difficulties are all in the details — keys whose numbers collide, numbers that are badly distributed, keys that are "equal" without being the same object, and arrays that must grow. `HashMap` is the JDK's general-purpose solution, and almost every Java service depends on it, directly or through `HashSet`, caches, frameworks and JSON libraries.

## 3. Beginner-Friendly Explanation

Imagine a cloakroom with 16 hooks numbered 0–15.

1. When you hand over your coat, the attendant computes a number from your ticket name — say 2,112 — and takes the remainder after dividing by 16: hook **0**.
2. Your coat goes on hook 0. If another coat is already there, the new one hangs *below* it on the same hook (a chain).
3. When you return, the attendant computes the same number, goes to hook 0, and checks each coat on that hook until finding *yours* — first by comparing numbers, then by checking the name properly.

The number is the **hash code**, the hook is the **bucket**, the remainder is the **index**, and "checking the name properly" is **`equals`**. Two different names that produce the same number (like `"Aa"` and `"BB"`, both 2,112) share a hook but are still told apart by `equals`.

## 4. Detailed Technical Explanation

### Point 1 — Internal table structure

```java title="OpenJDK 25 · java.util.HashMap (fields)"
transient Node<K,V>[] table;      // the buckets; length is always a power of two once allocated
transient int size;               // number of key-value mappings
transient int modCount;           // structural modifications, for fail-fast iterators
int threshold;                    // next size at which to resize (capacity * loadFactor)
final float loadFactor;           // default 0.75
transient Set<Map.Entry<K,V>> entrySet; // cached view
```

The table is **allocated lazily**: `new HashMap<>()` creates no array; the first `put` calls `resize()`, which allocates 16 buckets with a threshold of 12. Each bucket is either `null`, a single `Node`, a linked chain of `Node`s, or (for heavily collided buckets, next lesson) a `TreeNode` bin.

### Point 2 — Hash calculation

The map starts from the key's `hashCode()`:

- `String.hashCode()` is specified: `s[0]·31^(n−1) + s[1]·31^(n−2) + … + s[n−1]` in `int` arithmetic (overflow wraps). It is cached in the `String` object after first computation.
- `Integer.hashCode()` is the value itself; `Long.hashCode()` is `(int)(value ^ (value >>> 32))`.
- Records derive `hashCode` from their components; the exact formula is unspecified, but it is consistent with the record's `equals`.
- `Object.hashCode()` (identity hash) is used if a class does not override it.

> [!CONTRACT]
> `Object.hashCode` contract: (1) consistent while the fields used by `equals` do not change; (2) **equal objects must have equal hash codes**; (3) unequal objects *may* share a hash code, but distinct codes improve hash-table performance. `HashMap` is only correct if keys obey (1) and (2).

### Point 3 — Hash spreading

```java title="OpenJDK 25 · HashMap.hash(Object key)"
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

The index (point 4) uses only the **low bits** of the hash. For a 16-bucket table, only the lowest 4 bits matter. Hash codes that differ only in their high bits — common for floating-point keys, or for numbers that are multiples of large powers of two — would all collide. XOR-ing the upper 16 bits into the lower 16 lets high bits influence the bucket at the cost of one shift and one XOR. The JDK comment calls this the cheapest way "to reduce systematic lossage"; heavy collisions are left to tree bins.

> [!IMPL]
> The spreading function `h ^ (h >>> 16)` has been used since JDK 8. JDK 7 and earlier used a different, multi-shift supplemental hash function. Neither is part of the API contract.

### Point 4 — Bucket indexing

```java
int index = (n - 1) & hash;     // n = table.length, a power of two
```

For a power-of-two `n`, `n − 1` is a mask of low one-bits (15 = `0b1111`), so `(n − 1) & hash` keeps the low `log₂ n` bits. For non-negative hashes this equals `hash % n`; unlike `%`, it is never negative for negative hashes, and it is a single AND instruction. This is why `HashMap` table lengths are always powers of two: `tableSizeFor` rounds any requested initial capacity up.

### Point 5 — Key equality

Inside a bucket, each node is tested with:

```java title="OpenJDK 25 · HashMap.putVal / getNode (condition)"
p.hash == hash && ((k = p.key) == key || (key != null && key.equals(k)))
```

1. **Stored hash equal?** An `int` comparison — cheap, and it rules out most non-matching nodes without calling `equals`.
2. **Same reference?** Fast path for the common case of looking up with the very object that was inserted.
3. **`equals`?** Only reached when the hashes match.

Consequences: a key class that overrides `equals` but not `hashCode` breaks lookups (equal keys get different identity hashes, so step 1 fails); and `equals` is only as fast as you make it, because it runs on every hash match.

### Point 6 — Node creation

```java title="OpenJDK 25 · HashMap.Node (simplified)"
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;     // the SPREAD hash, stored so it is never recomputed (e.g. on resize)
    final K key;
    V value;
    Node<K,V> next;     // next node in the same bucket
    // getKey, getValue, setValue, equals, hashCode, toString
}
Node<K,V> newNode(int hash, K key, V value, Node<K,V> next) {
    return new Node<>(hash, key, value, next);
}
```

`newNode` is a factory method so that `LinkedHashMap` can override it and create its own entry subclass with ordering links (see [LinkedHashMap](/learn/maps/linkedhashmap-and-lru-cache)). `Node` *is* the `Map.Entry` you see when iterating `entrySet()`, which is why `setValue` during iteration writes through.

## 5. Internal Implementation

The path of a lookup through points 1–6, for `map.get("customer:42")` on a 16-bucket table:

```text
"customer:42".hashCode()           = -1772098662   1001011001011111_1110101110011010
h >>> 16                           =               0000000000000000_1001011001011111
spread = h ^ (h >>> 16)            = -1772126779   1001011001011111_0111110111000101
(16 - 1) & spread                  = 5             ............................0101
table[5] → compare stored hash → (==) → equals → found
```

Without spreading, the index would have been the low four bits of `h`, `1010` = 10. The spread changes which bits decide the bucket.

The `null` key is special-cased in `hash()`: it always hashes to 0 and lives in bucket 0. Equality checks use `key == k` first, so `null` never reaches `equals`.

Try the full path interactively — the simulator computes real Java `String.hashCode()` values and shows each bit step:

```viz
hashmap
```

## 6. Memory Representation

```text
HashMap
 ├─ table ──► Node[16]
 │            [0] ─► Node(hash=2112, key="Aa", value=2, next) ─► Node(hash=2112, key="BB", value=2, next=null)
 │            [1]   null
 │            [5] ─► Node(hash=-1772126779, key="customer:42", value=11, next=null)
 │            [10] ─► Node("ORD-1001") ...
 │            [11] ─► Node("ORD-1002") ...
 ├─ size = 5, threshold = 12, loadFactor = 0.75, modCount = 5
 └─ (keys and values are separate objects referenced by each Node)

Node (HotSpot model): 12-byte header + int hash + 3 references = 28 → 32 bytes
```

## 7. Runnable Java Example

```example
m07/HashMapIndexing
m07/KeyEqualityBug
```

## 8. Execution Walkthrough

**`HashMapIndexing`**

1. For each key it prints `hashCode()`, the spread hash and the 16-bucket index. `"ORD-1001"` and `"ORD-1002"` differ by one in their hash codes and land in adjacent buckets 10 and 11. (Without spreading, `ORD-1001` would land in bucket 12.)
2. `"Aa"` and `"BB"` have the same `hashCode()` — 2,112 — because `'A'·31 + 'a' = 65·31 + 97 = 2112` and `'B'·31 + 'B' = 66·31 + 66 = 2112`. Their spread hashes are equal too, so they share bucket 0.
3. The bit dump for `"customer:42"` shows the XOR folding the high half into the low half; the mask then keeps the low 4 bits: index 5. Negative hash codes are handled correctly by the mask.
4. Both colliding keys are still retrievable: colliding is not the same as being equal.
5. `put(null, 0)` returns `null` (no previous mapping): the `null` key is allowed and hashes to 0.
6. Finally, the program reads the real `table` of a JDK 25 `HashMap` by reflection and confirms that bucket 0 holds `[Aa, BB]` in insertion order — the prediction matches the implementation.

**`KeyEqualityBug`**

1. `BrokenAccountKey` overrides `equals` but uses an identity-based `hashCode`. Two equal keys almost certainly have different hash codes, so `get` looks in the wrong bucket (or compares unequal stored hashes) and returns `null`.
2. Putting an equal key again creates a **second** entry: size 2 — the map now violates its own "no duplicate keys" promise.
3. `AccountKey` overrides both consistently via `Objects.hash(bank, number)`; `AccountId` is a record and gets both for free. Both behave correctly.

## 9. Complexity Analysis

| Step | Cost |
|---|---|
| `hashCode()` | depends on the key: O(1) for `Integer`; O(length) for a `String` the first time, then cached; O(components) for records |
| spreading + indexing | O(1): a shift, an XOR, an AND |
| bucket scan | O(bucket size): constant on average with a good hash and load factor ≤ 0.75 |
| `equals` | only on hash matches; cost depends on the key class |
| node creation | O(1): one object allocation |

The average cost of `get`/`put` is therefore O(1) *plus the cost of hashing and comparing the key*. Expensive `hashCode`/`equals` implementations (deep object graphs, long strings without caching) are a common hidden cost.

## 10. Incorrect Implementation

```java
public final class OrderKey {
    private final String region;
    private final long orderNumber;

    @Override public boolean equals(Object o) {
        return o instanceof OrderKey k && region.equals(k.region) && orderNumber == k.orderNumber;
    }
    // hashCode not overridden -> Object.hashCode (identity)
}

Map<OrderKey, Order> cache = new HashMap<>();
cache.put(new OrderKey("EU", 42), order);
cache.get(new OrderKey("EU", 42));   // null: wrong bucket / different stored hash
```

Equally broken in a subtler way: `hashCode()` returning a constant (`return 1;`). It is *legal* — equal objects have equal hash codes — but every key lands in the same bucket, turning the map into a list (or a tree bin, next lesson).

## 11. Correct Implementation

```java
public record OrderKey(String region, long orderNumber) {
    public OrderKey {
        Objects.requireNonNull(region, "region");
    }
}
```

A record's `equals` and `hashCode` are derived from the same components, so they are consistent by construction, and records are shallowly immutable, which prevents the mutable-key problem covered in [HashMap Internals IV](/learn/maps/hashmap-internals-production-concerns). For a regular class, override both using the same fields (`Objects.equals`/`Objects.hash`, or hand-written for hot paths).

## 12. Enterprise Use Case

**Composite keys in a pricing engine.** Prices are looked up by `(productId, currency, customerTier)` millions of times per batch. Options:

- **String concatenation key** (`productId + "|" + currency + "|" + tier`): works, but allocates a new string per lookup and recomputes its hash (the cache lives on the new string object).
- **Record key** `record PriceKey(long productId, Currency currency, Tier tier)`: one small allocation per lookup (often scalar-replaced by the JIT when it does not escape), a cheap `hashCode` over three fields, and type safety. Preferred.
- **Nested maps** `Map<Long, Map<Currency, Map<Tier, Price>>>`: no key allocation, but three lookups and more memory.

Whatever the choice, the key's `hashCode` distribution matters: `productId` values that are multiples of 1,024, for example, differ only in higher bits — exactly the case spreading helps with.

## 13. Alternatives and Trade-offs

- **`TreeMap`**: needs `Comparable` keys or a comparator instead of `hashCode`; O(log n) guaranteed; sorted.
- **`IdentityHashMap`**: uses `System.identityHashCode` and `==`, for when *object identity* is the key (graph algorithms, serialization). It deliberately violates the general `Map` contract.
- **`EnumMap`**: for enum keys, an array indexed by ordinal — no hashing at all.
- **Open addressing** (used by `IdentityHashMap` and the `Map.of` implementations in OpenJDK) stores entries directly in the array and probes neighbouring slots; it avoids node objects but behaves badly at high load factors. `HashMap` uses separate chaining.

## 14. Edge Cases

- **`null` key**: allowed (one), always bucket 0. `null` values are allowed too, which makes `get(k) == null` ambiguous — use `containsKey`.
- **Negative hash codes**: handled by the mask; never use `Math.abs(hash) % n` in your own code (`Math.abs(Integer.MIN_VALUE)` is negative).
- **Equal hash, different keys** (`"Aa"`/`"BB"`): correct but slower; a flood of them is a denial-of-service vector for maps keyed by untrusted strings.
- **`equals` that throws** (e.g. `ClassCastException` on a foreign type) breaks lookups with mixed key types; follow the `instanceof` pattern.
- **Keys with expensive `hashCode`** (large collections as keys) cost O(size of key) per lookup — and are dangerous if mutable.
- **`hashCode` that depends on identity** in one class and on value in another (inheritance hierarchies) violates symmetry of `equals`; prefer final classes or records for keys.

## 15. Interview Questions

**Q1. What happens when two different keys have the same `hashCode`?**

<details><summary>Answer</summary>

They produce the same spread hash and the same bucket index, so they share a bucket (a collision). Both mappings are stored as separate nodes in that bucket's chain (or tree). Lookups compare the stored hash, then reference equality, then `equals`, so each key still finds its own value. Performance degrades only if many keys collide. *Follow-up:* "And if two keys are equal?" — then they are the *same* key: the second `put` replaces the value.

</details>

**Q2. Why does HashMap use `(n - 1) & hash` instead of `hash % n`?**

<details><summary>Answer</summary>

For power-of-two table sizes they are equivalent for non-negative hashes, but the mask is a single AND instruction and always yields a non-negative index even for negative hashes. It requires the table length to be a power of two, which `HashMap` enforces.

</details>

**Q3. Why does HashMap XOR the high bits into the low bits of the hash?**

<details><summary>Answer</summary>

Because the index uses only the low bits; keys whose hash codes differ only in high bits would otherwise all collide in small tables. `h ^ (h >>> 16)` is the cheapest mixing step that lets high bits influence the index; heavy remaining collisions are handled by tree bins. It is an OpenJDK 8+ implementation detail.

</details>

**Q4. Why must `equals` and `hashCode` be overridden together?**

<details><summary>Answer</summary>

`HashMap` first selects a bucket by hash and compares stored hashes before calling `equals`. If equal keys can have different hash codes, the lookup goes to the wrong bucket or skips the matching node, so `get` returns `null` and `put` creates duplicates — demonstrated by `KeyEqualityBug`. The `Object.hashCode` contract requires equal objects to have equal hash codes.

</details>

**Q5. What is stored in `Node.hash` and why?**

<details><summary>Answer</summary>

The spread hash of the key, computed once at insertion. It allows fast `int` comparisons before `equals`, and lets `resize()` redistribute nodes without calling `hashCode()` again — important because `hashCode` can be expensive.

</details>

## 16. Practice Exercise

Compute by hand (then check with the simulator, String mode): the `hashCode()`, spread hash and 16-bucket index of the key `"BB"`, and of `"Ab"`. Do they collide? Then design a `Point(int x, int y)` key whose `hashCode` would collide catastrophically, and fix it.

<details><summary>Solution</summary>

`"BB"`: 66 × 31 + 66 = **2112**; `2112 >>> 16 = 0`, so the spread hash is 2112; `2112 & 15 = 0` (2112 = 132 × 16) → **bucket 0**.
`"Ab"`: 65 × 31 + 98 = **2113**; spread 2113; `2113 & 15 = 1` → **bucket 1**. No collision.

A catastrophic design: `hashCode() { return x + y; }` maps every point on the same anti-diagonal (`(0,10)`, `(1,9)`, …) to the same hash; worse, `return x ^ y;` makes every `(a, a)` point hash to 0. Fix with a record (`record Point(int x, int y) {}`) or `31 * x + y` / `Objects.hash(x, y)`, which distinguish order and spread values better.

</details>

## 17. Key Takeaways

- `HashMap` = a lazily allocated, power-of-two array of buckets holding `Node(hash, key, value, next)` chains.
- Index = `(n − 1) & (h ^ (h >>> 16))` where `h = key.hashCode()`; `null` keys go to bucket 0.
- Lookup compares **stored hash → reference → equals**; equal keys must have equal hash codes.
- Collisions are normal and handled; *equality* decides identity of keys.
- Spreading, node layout and table sizing are OpenJDK implementation details; the `hashCode`/`equals` contract is the specification.

## 18. Official References

- [`java.util.HashMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html)
- [`java.lang.Object#hashCode()` and `equals` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Object.html#hashCode())
- [`java.lang.String#hashCode()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/String.html#hashCode())
- [`java.lang.Record` — equals/hashCode of records](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Record.html)
- [OpenJDK 25 source: `HashMap.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/HashMap.java)
