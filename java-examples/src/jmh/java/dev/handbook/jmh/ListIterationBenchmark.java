package dev.handbook.jmh;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.Setup;
import org.openjdk.jmh.annotations.State;

/**
 * ArrayList vs LinkedList full iteration (Module 2/5). The handbook publishes NO numbers from this
 * benchmark; run it on your own hardware:  ./gradlew jmh -PjmhArgs="ListIterationBenchmark -f 1"
 */
@State(Scope.Benchmark)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
public class ListIterationBenchmark {

    @Param({"1000", "100000"})
    int size;

    List<Integer> arrayList;
    List<Integer> linkedList;

    @Setup
    public void setUp() {
        arrayList = new ArrayList<>(size);
        linkedList = new LinkedList<>();
        for (int i = 0; i < size; i++) {
            arrayList.add(i);
            linkedList.add(i);
        }
    }

    @Benchmark
    public long iterateArrayList() {
        long sum = 0;
        for (Integer value : arrayList) {
            sum += value;
        }
        return sum;
    }

    @Benchmark
    public long iterateLinkedList() {
        long sum = 0;
        for (Integer value : linkedList) {
            sum += value;
        }
        return sum;
    }
}
