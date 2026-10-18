package dev.handbook.m07;

import dev.handbook.support.JdkInternals;
import java.util.HashMap;

/**
 * Shows capacity, threshold, resizing and lo/hi bucket splitting on the running JDK.
 *
 * <p>Table length and threshold are OpenJDK implementation details read by reflection; run with
 * {@code --add-opens java.base/java.util=ALL-UNNAMED} (configured for {@code ./gradlew run}).
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.HashMapResizeDemo}
 */
public final class HashMapResizeDemo {

    private HashMapResizeDemo() {
    }

    public static void main(String[] args) {
        if (!JdkInternals.available()) {
            System.out.println("Run with --add-opens java.base/java.util=ALL-UNNAMED to observe the table.");
            return;
        }

        HashMap<Integer, String> map = new HashMap<>();
        System.out.println("new HashMap<>():   table=" + JdkInternals.hashMapCapacity(map) + " (allocated lazily)");
        int lastCapacity = 0;
        for (int i = 1; i <= 100; i++) {
            map.put(i, "v" + i);
            int capacity = JdkInternals.hashMapCapacity(map);
            if (capacity != lastCapacity) {
                System.out.printf("after put #%-3d     table=%-4d threshold=%d%n",
                        i, capacity, JdkInternals.hashMapThreshold(map));
                lastCapacity = capacity;
            }
        }

        // Integer.hashCode() is the int value itself, and (h >>> 16) is 0 for small values,
        // so key k lands in bucket k & (n - 1). Keys 5 and 21 share bucket 5 in a 16-slot table.
        HashMap<Integer, String> split = new HashMap<>(16);
        split.put(5, "five");
        split.put(21, "twenty-one");
        split.put(37, "thirty-seven");
        System.out.println();
        System.out.println("16 slots, bucket 5: " + JdkInternals.bucketKeys(split, 5));
        for (int k = 200; k < 210; k++) { // buckets 8..15, 0, 1: never 5 or 21
            split.put(k, "filler"); // push size past the threshold of 12
        }
        System.out.println("32 slots, bucket 5: " + JdkInternals.bucketKeys(split, 5)
                + "  bucket 21: " + JdkInternals.bucketKeys(split, 21)
                + "  (21 & 16 != 0 moves to 5 + 16)");

        // Pre-sizing. new HashMap<>(n) sets the TABLE size, not the number of entries it holds.
        HashMap<Integer, String> naive = new HashMap<>(100);
        HashMap<Integer, String> sized = HashMap.newHashMap(100); // Java 19+
        for (int i = 0; i < 100; i++) {
            naive.put(i, "x");
            sized.put(i, "x");
        }
        System.out.println();
        System.out.println("new HashMap<>(100) after 100 puts:    table=" + JdkInternals.hashMapCapacity(naive)
                + " (resized once: 128 * 0.75 = 96 < 100)");
        System.out.println("HashMap.newHashMap(100) after 100 puts: table=" + JdkInternals.hashMapCapacity(sized)
                + " (ceil(100 / 0.75) = 134 -> 256, no resize)");
    }
}
