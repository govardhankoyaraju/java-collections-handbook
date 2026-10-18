package dev.handbook.m07;

import dev.handbook.support.JdkInternals;
import java.util.HashMap;
import java.util.Map;

/**
 * Computes, for a few String keys, every number HashMap derives from a key: hashCode(), the
 * spread hash, and the bucket index for a 16-slot table. Then it checks the prediction against
 * the real table of a HashMap (implementation detail, read by reflection).
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.HashMapIndexing}
 */
public final class HashMapIndexing {

    private HashMapIndexing() {
    }

    /** Same expression as OpenJDK's {@code HashMap.hash(Object)} (JDK 8 through 25). */
    public static int spread(Object key) {
        int h;
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }

    /** Bucket index for a power-of-two table length: identical to {@code hash % n} for non-negative hashes, but also correct for negative ones. */
    public static int bucketIndex(int spreadHash, int tableLength) {
        if (Integer.bitCount(tableLength) != 1) {
            throw new IllegalArgumentException("HashMap table lengths are powers of two: " + tableLength);
        }
        return (tableLength - 1) & spreadHash;
    }

    static String bits(int value) {
        String s = String.format("%32s", Integer.toBinaryString(value)).replace(' ', '0');
        return s.substring(0, 16) + "_" + s.substring(16);
    }

    public static void main(String[] args) {
        String[] keys = {"ORD-1001", "ORD-1002", "Aa", "BB", "customer:42"};
        System.out.printf("%-12s %12s %12s %6s%n", "key", "hashCode()", "spread", "index");
        for (String key : keys) {
            int h = key.hashCode();
            int spread = spread(key);
            System.out.printf("%-12s %12d %12d %6d%n", key, h, spread, bucketIndex(spread, 16));
        }

        String key = "customer:42";
        int h = key.hashCode();
        System.out.println();
        System.out.println("h          = " + bits(h));
        System.out.println("h >>> 16   = " + bits(h >>> 16));
        System.out.println("h ^ h>>>16 = " + bits(spread(key)));
        System.out.println("mask (15)  = " + bits(15));
        System.out.println("index      = " + bucketIndex(spread(key), 16));

        System.out.println();
        System.out.println("\"Aa\".hashCode() == \"BB\".hashCode(): " + ("Aa".hashCode() == "BB".hashCode()));
        Map<String, Integer> map = new HashMap<>();
        for (String k : keys) {
            map.put(k, k.length());
        }
        System.out.println("both keys still retrievable: Aa=" + map.get("Aa") + ", BB=" + map.get("BB"));
        System.out.println("null key is allowed in HashMap and hashes to " + spread(null)
                + "; map.put(null, 0) returns " + map.put(null, 0));

        if (JdkInternals.available()) {
            HashMap<String, Integer> real = new HashMap<>();
            for (String k : keys) {
                real.put(k, k.length());
            }
            int capacity = JdkInternals.hashMapCapacity(real);
            int predicted = bucketIndex(spread("Aa"), capacity);
            System.out.println("real table length=" + capacity + ", bucket " + predicted + " holds "
                    + JdkInternals.bucketKeys(real, predicted));
        }
    }
}
