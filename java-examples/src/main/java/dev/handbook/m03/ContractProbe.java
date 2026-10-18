package dev.handbook.m03;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Probes three contract questions — duplicates, nulls and modifiability — against real
 * implementations, and prints what actually happens (return value or exception type).
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m03.ContractProbe}
 */
public final class ContractProbe {

    private ContractProbe() {
    }

    static String probe(Supplier<?> action) {
        try {
            Object result = action.get();
            return "returns " + result;
        } catch (RuntimeException e) {
            return "throws " + e.getClass().getSimpleName();
        }
    }

    static void report(String name, Collection<String> c) {
        String duplicate = probe(() -> {
            c.add("A");
            return c.add("A");
        });
        String addNull = probe(() -> c.add(null));
        System.out.printf("%-28s add duplicate: %-16s add null: %s%n", name, duplicate, addNull);
    }

    public static void main(String[] args) {
        report("ArrayList", new ArrayList<>());
        report("HashSet", new HashSet<>());
        report("TreeSet (natural order)", new TreeSet<>());
        report("ArrayDeque", new ArrayDeque<>());
        report("ConcurrentHashMap.newKeySet", ConcurrentHashMap.newKeySet());

        List<String> immutable = List.of("A", "B");
        System.out.println("List.of(...).add(\"C\")        " + probe(() -> immutable.add("C")));
        System.out.println("List.of(...).contains(null)  " + probe(() -> immutable.contains(null)));
        System.out.println("List.of(\"A\", null)           " + probe(() -> List.of("A", null)));
        System.out.println("Set.of(\"A\", \"A\")             " + probe(() -> Set.of("A", "A")));

        List<String> fixedSize = java.util.Arrays.asList("A", "B");
        System.out.println("Arrays.asList(...).set(0, Z) " + probe(() -> fixedSize.set(0, "Z")));
        System.out.println("Arrays.asList(...).add(C)    " + probe(() -> fixedSize.add("C")));
    }
}
