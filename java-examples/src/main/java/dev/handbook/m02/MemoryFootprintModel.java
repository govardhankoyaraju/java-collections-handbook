package dev.handbook.m02;

/**
 * An explicit <strong>model</strong> of heap footprint for storing n integers four different ways.
 *
 * <p>This is arithmetic, not a measurement. The Java Language Specification does not define
 * object layout. The constants below describe a common configuration of 64-bit HotSpot
 * (JDK 25, default settings, heap under ~32 GB): 12-byte object headers, 4-byte compressed
 * references, 16-byte array headers and 8-byte object alignment. With
 * {@code -XX:+UseCompactObjectHeaders} (JEP 519, a product option since JDK 25) headers shrink to
 * 8 bytes. Use a tool such as JOL (Java Object Layout) to measure a specific JVM.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m02.MemoryFootprintModel}
 */
public final class MemoryFootprintModel {

    static final int OBJECT_HEADER = 12;
    static final int ARRAY_HEADER = 16;
    static final int REFERENCE = 4;
    static final int ALIGNMENT = 8;

    private MemoryFootprintModel() {
    }

    static long align(long bytes) {
        return (bytes + ALIGNMENT - 1) / ALIGNMENT * ALIGNMENT;
    }

    /** {@code int[]}: values stored inline, one contiguous block. */
    static long intArray(int n) {
        return align(ARRAY_HEADER + 4L * n);
    }

    /** One {@code Integer} object: header + 4-byte value, padded to 16 bytes. */
    static long integerObject() {
        return align(OBJECT_HEADER + 4);
    }

    /**
     * {@code ArrayList<Integer>} with capacity == size (e.g. after trimToSize): the list object,
     * its {@code Object[]} of references, and one {@code Integer} per element. Values from -128 to
     * 127 come from the shared {@code Integer} cache; we assume distinct, uncached values.
     */
    static long arrayListOfInteger(int n) {
        long listObject = align(OBJECT_HEADER + 4 /* modCount */ + 4 /* size */ + REFERENCE /* elementData */);
        long backingArray = align(ARRAY_HEADER + (long) REFERENCE * n);
        return listObject + backingArray + n * integerObject();
    }

    /** {@code LinkedList<Integer>}: the list object plus, per element, one Node and one Integer. */
    static long linkedListOfInteger(int n) {
        long listObject = align(OBJECT_HEADER + 4 /* modCount */ + 4 /* size */ + 2L * REFERENCE /* first, last */);
        long node = align(OBJECT_HEADER + 3L * REFERENCE /* item, next, prev */);
        return listObject + n * (node + integerObject());
    }

    public static void main(String[] args) {
        int n = 1_000_000;
        System.out.println("Model: 64-bit HotSpot, compressed oops, 12-byte headers, 8-byte alignment");
        System.out.printf("%-26s %12s %14s%n", "structure (n = 1,000,000)", "bytes", "bytes/element");
        print("int[]", intArray(n), n);
        print("ArrayList<Integer>", arrayListOfInteger(n), n);
        print("LinkedList<Integer>", linkedListOfInteger(n), n);
        System.out.printf("Objects allocated: int[] = 1, ArrayList = %d, LinkedList = %d%n",
                2 + n, 1 + 2L * n);
    }

    private static void print(String name, long bytes, int n) {
        System.out.printf("%-26s %,12d %14.1f%n", name, bytes, (double) bytes / n);
    }
}
