package dev.handbook.support;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.io.UncheckedIOException;
import java.lang.reflect.InvocationTargetException;
import java.nio.charset.StandardCharsets;

/** Test helper: runs an example's {@code main} method and captures what it prints. */
public final class MainRunner {

    private MainRunner() {
    }

    public static synchronized String run(Class<?> exampleClass) {
        PrintStream original = System.out;
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (PrintStream capture = new PrintStream(buffer, true, StandardCharsets.UTF_8)) {
            System.setOut(capture);
            exampleClass.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            throw new AssertionError("Example threw " + e.getCause(), e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        } finally {
            System.setOut(original);
        }
        return normalize(buffer.toString(StandardCharsets.UTF_8));
    }

    /** Reads {@code /expected-output/<SimpleName>.txt} from the test classpath. */
    public static String expected(Class<?> exampleClass) {
        String path = "/expected-output/" + exampleClass.getSimpleName() + ".txt";
        try (InputStream in = MainRunner.class.getResourceAsStream(path)) {
            if (in == null) {
                throw new AssertionError("Missing expected output file " + path);
            }
            return normalize(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String normalize(String s) {
        return s.replace("\r\n", "\n").stripTrailing() + "\n";
    }
}
