package dev.handbook.m02;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Matching orders to customers: a nested scan versus a one-time HashMap index.
 *
 * <p>With m orders and n customers the nested scan does up to m × n comparisons. Building the
 * index costs O(n) once; each lookup is then O(1) on average, for O(n + m) overall.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m02.LookupIndexing}
 */
public final class LookupIndexing {

    private LookupIndexing() {
    }

    public record Customer(long id, String name) {
    }

    public record Order(long orderId, long customerId) {
    }

    public record EnrichedOrder(long orderId, String customerName) {
    }

    /** Counts comparisons so the growth is visible without timing anything. */
    public static final class Counter {
        private long value;

        void increment() {
            value++;
        }

        public long value() {
            return value;
        }
    }

    /** INCORRECT at scale: re-scans the customer list for every order. */
    public static List<EnrichedOrder> enrichByScanning(List<Order> orders, List<Customer> customers, Counter counter) {
        List<EnrichedOrder> result = new ArrayList<>(orders.size());
        for (Order order : orders) {
            for (Customer customer : customers) {
                counter.increment();
                if (customer.id() == order.customerId()) {
                    result.add(new EnrichedOrder(order.orderId(), customer.name()));
                    break;
                }
            }
        }
        return result;
    }

    /** CORRECT: index customers by id once, then do one hash lookup per order. */
    public static List<EnrichedOrder> enrichWithIndex(List<Order> orders, List<Customer> customers, Counter counter) {
        Map<Long, Customer> byId = new HashMap<>();
        for (Customer customer : customers) {
            counter.increment();
            Customer previous = byId.putIfAbsent(customer.id(), customer);
            if (previous != null) {
                throw new IllegalArgumentException("Duplicate customer id " + customer.id());
            }
        }
        List<EnrichedOrder> result = new ArrayList<>(orders.size());
        for (Order order : orders) {
            counter.increment();
            Optional.ofNullable(byId.get(order.customerId()))
                    .ifPresent(c -> result.add(new EnrichedOrder(order.orderId(), c.name())));
        }
        return result;
    }

    static List<Customer> customers(int n) {
        List<Customer> list = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            list.add(new Customer(i, "Customer-" + i));
        }
        return list;
    }

    static List<Order> orders(int m, int customerCount) {
        List<Order> list = new ArrayList<>(m);
        for (int i = 0; i < m; i++) {
            list.add(new Order(10_000 + i, (i * 7L) % customerCount));
        }
        return list;
    }

    public static void main(String[] args) {
        System.out.printf("%10s %10s %18s %16s%n", "customers", "orders", "scan comparisons", "index operations");
        for (int n : new int[] {100, 1_000, 10_000}) {
            List<Customer> customers = customers(n);
            List<Order> orders = orders(n, n);
            Counter scan = new Counter();
            Counter indexed = new Counter();
            List<EnrichedOrder> a = enrichByScanning(orders, customers, scan);
            List<EnrichedOrder> b = enrichWithIndex(orders, customers, indexed);
            if (!a.equals(b)) {
                throw new IllegalStateException("Both strategies must produce the same result");
            }
            System.out.printf("%10d %10d %18d %16d%n", n, n, scan.value(), indexed.value());
        }
    }
}
