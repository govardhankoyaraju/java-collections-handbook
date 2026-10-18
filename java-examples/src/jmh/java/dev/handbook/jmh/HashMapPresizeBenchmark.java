package dev.handbook.jmh;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.State;

/**
 * Pre-sized vs default HashMap population (Module 7). No results are published in the handbook.
 * Run:  ./gradlew jmh -PjmhArgs="HashMapPresizeBenchmark -f 1"
 */
@State(Scope.Benchmark)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
public class HashMapPresizeBenchmark {

    @Param({"1000", "100000"})
    int size;

    @Benchmark
    public Map<Integer, Integer> defaultCapacity() {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < size; i++) {
            map.put(i, i);
        }
        return map;
    }

    @Benchmark
    public Map<Integer, Integer> presized() {
        Map<Integer, Integer> map = HashMap.newHashMap(size);
        for (int i = 0; i < size; i++) {
            map.put(i, i);
        }
        return map;
    }
}
