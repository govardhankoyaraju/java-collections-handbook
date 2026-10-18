package dev.handbook.m03;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.NavigableSet;
import java.util.PriorityQueue;
import java.util.Queue;
import java.util.RandomAccess;
import java.util.SequencedCollection;
import java.util.SequencedMap;
import java.util.SequencedSet;
import java.util.Set;
import java.util.SortedMap;
import java.util.SortedSet;
import java.util.StringJoiner;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Prints which Collections Framework interfaces each common implementation satisfies on the
 * running JDK. Requires Java 21+ (Sequenced* interfaces).
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m03.HierarchyTour}
 */
public final class HierarchyTour {

    private HierarchyTour() {
    }

    static String interfacesOf(Object o) {
        StringJoiner j = new StringJoiner(", ");
        if (o instanceof Collection<?>) j.add("Collection");
        if (o instanceof SequencedCollection<?>) j.add("SequencedCollection");
        if (o instanceof List<?>) j.add("List");
        if (o instanceof RandomAccess) j.add("RandomAccess");
        if (o instanceof Set<?>) j.add("Set");
        if (o instanceof SequencedSet<?>) j.add("SequencedSet");
        if (o instanceof SortedSet<?>) j.add("SortedSet");
        if (o instanceof NavigableSet<?>) j.add("NavigableSet");
        if (o instanceof Queue<?>) j.add("Queue");
        if (o instanceof Deque<?>) j.add("Deque");
        if (o instanceof Map<?, ?>) j.add("Map");
        if (o instanceof SequencedMap<?, ?>) j.add("SequencedMap");
        if (o instanceof SortedMap<?, ?>) j.add("SortedMap");
        if (o instanceof NavigableMap<?, ?>) j.add("NavigableMap");
        return j.toString();
    }

    public static void main(String[] args) {
        Object[] samples = {
            new ArrayList<String>(), new LinkedList<String>(), new ArrayDeque<String>(),
            new PriorityQueue<String>(), new HashSet<String>(), new LinkedHashSet<String>(),
            new TreeSet<String>(), new HashMap<String, Integer>(), new LinkedHashMap<String, Integer>(),
            new TreeMap<String, Integer>()
        };
        for (Object sample : samples) {
            System.out.printf("%-14s -> %s%n", sample.getClass().getSimpleName(), interfacesOf(sample));
        }
    }
}
