package dev.handbook.m07;

/**
 * An explicit <strong>model</strong> (not a measurement) of HashMap heap usage on 64-bit HotSpot
 * with compressed references: 12-byte object headers, 4-byte references, 8-byte alignment.
 * {@code -XX:+UseCompactObjectHeaders} (JDK 25, JEP 519) reduces headers to 8 bytes.
 * Measure real layouts with JOL.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.HashMapMemoryModel}
 */
public final class HashMapMemoryModel {

    static final int HEADER = 12;
    static final int REF = 4;

    private HashMapMemoryModel() {
    }

    static long align(long bytes) {
        return (bytes + 7) / 8 * 8;
    }

    /** HashMap.Node: int hash + key, value, next references. */
    static long node() {
        return align(HEADER + 4 + 3L * REF);
    }

    /**
     * HashMap.TreeNode extends LinkedHashMap.Entry extends HashMap.Node: adds before, after,
     * parent, left, right, prev references and a boolean.
     */
    static long treeNode() {
        return align(HEADER + 4 + 3L * REF + 2L * REF + 4L * REF + 1);
    }

    /** Node[] table of the given length. */
    static long table(int capacity) {
        return align(16 + (long) REF * capacity);
    }

    static int capacityFor(int entries) {
        int capacity = 16;
        while (entries > capacity * 3 / 4) {
            capacity <<= 1;
        }
        return capacity;
    }

    public static void main(String[] args) {
        System.out.println("Node = " + node() + " bytes, TreeNode = " + treeNode() + " bytes (model)");
        System.out.printf("%10s %10s %14s %18s%n", "entries", "table", "table+nodes", "per entry (excl. keys/values)");
        for (int n : new int[] {12, 13, 1_000, 1_000_000}) {
            int capacity = capacityFor(n);
            long bytes = table(capacity) + n * node();
            System.out.printf("%10d %10d %,14d %18.1f%n", n, capacity, bytes, (double) bytes / n);
        }
    }
}
