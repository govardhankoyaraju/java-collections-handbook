package dev.handbook.m03;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.SequencedCollection;
import java.util.SequencedMap;
import java.util.SequencedSet;
import java.util.TreeSet;

/**
 * Java 21 sequenced collections (JEP 431): uniform first/last access and reversed views.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m03.SequencedTour}
 */
public final class SequencedTour {

    private SequencedTour() {
    }

    /** Works for any List, Deque, LinkedHashSet, SortedSet... one method instead of four idioms. */
    static <E> String ends(SequencedCollection<E> c) {
        return c.isEmpty() ? "(empty)" : "first=" + c.getFirst() + ", last=" + c.getLast();
    }

    public static void main(String[] args) {
        List<String> steps = new ArrayList<>(List.of("validate", "price", "persist"));
        Deque<String> deque = new ArrayDeque<>(steps);
        SequencedSet<String> tags = new LinkedHashSet<>(List.of("new", "priority", "export"));
        TreeSet<String> sorted = new TreeSet<>(List.of("delta", "alpha", "charlie"));

        System.out.println("ArrayList     " + ends(steps));
        System.out.println("ArrayDeque    " + ends(deque));
        System.out.println("LinkedHashSet " + ends(tags));
        System.out.println("TreeSet       " + ends(sorted));

        // reversed() returns a VIEW, not a copy: writes through the view change the original.
        List<String> reversed = steps.reversed();
        reversed.addFirst("audit"); // first of the view == last of the original
        System.out.println("steps after reversed().addFirst(\"audit\"): " + steps);

        // LinkedHashSet.addFirst moves an existing element to the front.
        tags.addFirst("export");
        System.out.println("tags after addFirst(\"export\"): " + tags);

        // A sorted set decides positions by comparison, so explicit positioning is unsupported.
        try {
            sorted.addFirst("zulu");
        } catch (UnsupportedOperationException e) {
            System.out.println("TreeSet.addFirst -> UnsupportedOperationException");
        }

        SequencedMap<String, Integer> stock = new LinkedHashMap<>();
        stock.put("SKU-2", 5);
        stock.put("SKU-3", 0);
        stock.putFirst("SKU-1", 9);
        System.out.println("map=" + stock + " firstEntry=" + stock.firstEntry() + " reversed=" + stock.reversed());
        System.out.println("pollLastEntry=" + stock.pollLastEntry() + " map now=" + stock);

        try {
            new ArrayList<String>().getFirst();
        } catch (java.util.NoSuchElementException e) {
            System.out.println("getFirst() on empty list -> NoSuchElementException");
        }
    }
}
