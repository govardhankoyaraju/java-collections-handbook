package dev.handbook.support;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * Reads JDK-internal fields so lessons can show <em>implementation details</em> of the running JDK.
 *
 * <p>Nothing here is part of the Java SE API contract. Field names ({@code elementData},
 * {@code table}, {@code threshold}) are those of OpenJDK 25 and may change in any release.
 * Reflective access requires the JVM option {@code --add-opens java.base/java.util=ALL-UNNAMED};
 * the Gradle build passes it to tests and to {@code ./gradlew run}.
 *
 * <p>Never use this technique in production code.
 */
public final class JdkInternals {

    private JdkInternals() {
    }

    /** Returns {@code true} when the JVM allows reflective access to {@code java.util} internals. */
    public static boolean available() {
        try {
            field(ArrayList.class, "elementData");
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }

    /** Length of the backing array of an {@link ArrayList}: its current capacity. */
    public static int arrayListCapacity(ArrayList<?> list) {
        Object[] elementData = (Object[]) read(field(ArrayList.class, "elementData"), list);
        return elementData.length;
    }

    /** Length of the bucket table of a {@link HashMap}, or 0 if the table has not been allocated yet. */
    public static int hashMapCapacity(HashMap<?, ?> map) {
        Object[] table = (Object[]) read(field(HashMap.class, "table"), map);
        return table == null ? 0 : table.length;
    }

    /**
     * The {@code threshold} field of a {@link HashMap}. Before the table is allocated it temporarily
     * holds the requested initial capacity (or 0 for the default); afterwards it is
     * {@code (int) (capacity * loadFactor)}.
     */
    public static int hashMapThreshold(HashMap<?, ?> map) {
        return (Integer) read(field(HashMap.class, "threshold"), map);
    }

    /** Keys stored in one bucket, in the order the bucket's {@code next} links visit them. */
    public static List<Object> bucketKeys(HashMap<?, ?> map, int index) {
        Object[] table = (Object[]) read(field(HashMap.class, "table"), map);
        List<Object> keys = new ArrayList<>();
        if (table == null) {
            return keys;
        }
        Object node = table[index];
        while (node != null) {
            keys.add(read(field(node.getClass(), "key"), node));
            node = read(field(node.getClass(), "next"), node);
        }
        return keys;
    }

    /** Simple class name of the first node in a bucket: {@code Node}, {@code TreeNode}, or {@code null} if empty. */
    public static String bucketNodeType(HashMap<?, ?> map, int index) {
        Object[] table = (Object[]) read(field(HashMap.class, "table"), map);
        if (table == null || table[index] == null) {
            return null;
        }
        return table[index].getClass().getSimpleName();
    }

    private static Field field(Class<?> type, String name) {
        for (Class<?> c = type; c != null; c = c.getSuperclass()) {
            try {
                Field f = c.getDeclaredField(name);
                f.setAccessible(true);
                return f;
            } catch (NoSuchFieldException e) {
                // keep walking up the hierarchy
            } catch (RuntimeException e) { // InaccessibleObjectException
                throw new IllegalStateException(
                        "Run with --add-opens java.base/java.util=ALL-UNNAMED to inspect " + type.getName(), e);
            }
        }
        throw new IllegalStateException("No field '" + name + "' in " + type.getName()
                + " (JDK implementation changed?)");
    }

    private static Object read(Field f, Object target) {
        try {
            return f.get(target);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException(e);
        }
    }
}
