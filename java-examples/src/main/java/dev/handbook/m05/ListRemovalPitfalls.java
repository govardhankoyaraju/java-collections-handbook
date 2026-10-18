package dev.handbook.m05;

import java.util.ArrayList;
import java.util.ConcurrentModificationException;
import java.util.Iterator;
import java.util.List;

/**
 * Removing elements from an ArrayList: two common bugs and two correct approaches.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m05.ListRemovalPitfalls}
 */
public final class ListRemovalPitfalls {

    private ListRemovalPitfalls() {
    }

    public record Invoice(String id, String status) {
        boolean cancelled() {
            return "CANCELLED".equals(status);
        }
    }

    static List<Invoice> sample() {
        return new ArrayList<>(List.of(
                new Invoice("INV-1", "OPEN"),
                new Invoice("INV-2", "CANCELLED"),
                new Invoice("INV-3", "CANCELLED"),
                new Invoice("INV-4", "PAID")));
    }

    /** BUG: after remove(i) the next element shifts into slot i, and i++ skips it. */
    static List<Invoice> removeCancelledByIndexBuggy(List<Invoice> invoices) {
        for (int i = 0; i < invoices.size(); i++) {
            if (invoices.get(i).cancelled()) {
                invoices.remove(i);
            }
        }
        return invoices;
    }

    /** BUG: structural modification during for-each; the iterator detects it (best effort). */
    static List<Invoice> removeCancelledInForEach(List<Invoice> invoices) {
        for (Invoice invoice : invoices) {
            if (invoice.cancelled()) {
                invoices.remove(invoice);
            }
        }
        return invoices;
    }

    /** CORRECT: Iterator.remove keeps the iterator's cursor and expected modCount in sync. */
    static List<Invoice> removeCancelledWithIterator(List<Invoice> invoices) {
        for (Iterator<Invoice> it = invoices.iterator(); it.hasNext(); ) {
            if (it.next().cancelled()) {
                it.remove(); // each remove still shifts the tail: O(n) per removal
            }
        }
        return invoices;
    }

    /** CORRECT and preferred: ArrayList.removeIf compacts the array in one O(n) pass. */
    static List<Invoice> removeCancelledWithRemoveIf(List<Invoice> invoices) {
        invoices.removeIf(Invoice::cancelled);
        return invoices;
    }

    static String ids(List<Invoice> invoices) {
        return invoices.stream().map(Invoice::id).toList().toString();
    }

    public static void main(String[] args) {
        System.out.println("index loop (buggy):  " + ids(removeCancelledByIndexBuggy(sample())));
        try {
            removeCancelledInForEach(sample());
            System.out.println("for-each: no exception this time (fail-fast is best effort)");
        } catch (ConcurrentModificationException e) {
            System.out.println("for-each remove:     ConcurrentModificationException");
        }
        System.out.println("Iterator.remove:     " + ids(removeCancelledWithIterator(sample())));
        System.out.println("removeIf:            " + ids(removeCancelledWithRemoveIf(sample())));
    }
}
