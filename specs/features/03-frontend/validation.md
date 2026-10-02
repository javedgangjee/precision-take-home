# Feature 3 validation: Frontend

The worked examples that this feature covers are the two brief examples for a 4 by 4 grid, the example input (e) in the brief picture, and the default batch size in N11. They are cases V1.1, V1.2, V3.1, and V7.1.

## Automated checks

The command for V1 to V9 is `make test`. The command for V10 is `make lint`. The command for V11 is `cd frontend && npx ng build`.

### V1. Binning follows (v - 1) mod N²

- V1.1. With N = 4, the value 17 goes to cell <0,0>.
- V1.2. With N = 4, the value 8 goes to cell <1,3>.
- With N = 4, the value 0 goes to cell <3,3>.
- With N = 4, the value 1 goes to cell <0,0>, and the value 16 goes to cell <3,3>.
- With N = 1, the values 0, 1, and 1,000,000 all go to cell <0,0>.
- With N = 32, the value 1,024 goes to cell <31,31>, and the value 1,025 goes to cell <0,0>.

### V2. The counts keep a running total

- A new counts object with N = 4 has 16 cells at 0, a max of 0, and a total of 0.
- After `apply([17, 8, 17])` with N = 4, cell <0,0> holds 2, cell <1,3> holds 1, the max is 2, and the total is 3.
- After `reset(8)`, the counts have 64 cells at 0, a max of 0, and a total of 0.
- With a cell set to 4,294,967,296, one more hit makes it 4,294,967,297, which proves the counts do not wrap at 32 bits.

### V3. The store applies batches and changes N

- V3.1. With N = 4, the example input 4, 11, 6, 6, 11, 11, 11, 6, 11, 6, 6, 11, 11, 11, 11, 11 gives cell <2,2> a count of 10, cell <1,1> a count of 5, and cell <0,3> a count of 1. All other cells hold 0, the max is 10, and the total is 16.
- The default N is 32.
- `setN(0)` sets N to 1, and `setN(101)` sets N to 100.
- After a batch, `setN(33)` sets every count, the max, and the total to 0.

### V4. The color map runs from blue to red

- `colorPosition(0, 10)` is null, so the cell has no color.
- `colorPosition(1, 10)` is 0, `colorPosition(10, 10)` is 1, and `colorPosition(5, 10)` is 4/9.
- `colorPosition(1, 1)` is 0, so a lone hit gets the blue end.
- The color at position 0 is rgb(30,0,255), at 1/3 it is rgb(0,255,173), at 2/3 it is rgb(194,255,0), and at 1 it is rgb(255,0,51). Each channel may differ by 1 from these values because of rounding.
- The color at position 4/9, which is cell (b) of the brief picture, is rgb(0,255,51) within 1 per channel.
- `scaleLabels(0)` is an empty list, and `scaleLabels(1)` is ["1"].
- `scaleLabels(2)` is ["2", "1.5", "1"], and `scaleLabels(3)` is ["3", "2", "1"].
- `scaleLabels(10)` is ["10", "5.5", "1"], which matches the 1 to 10 scale of the brief picture at its ends.
- `scaleLabels(1025)` is ["1,025", "513", "1"].

### V5. The layout puts row 0 at the bottom and spaces the labels

- `labelStep` returns 1 for N of 1 and 16, 2 for N of 17 and 32, and 4 for N of 33 and 100.
- With N = 32, the labelled rows are 0, 2, 4, and so on to 30, which is 16 labels.
- With N = 4 and a 400 px canvas, cell <0,0> touches the bottom left corner, and cell <3,3> touches the top right corner.
- With N = 7 and a 400 px canvas, the cell widths differ by at most 1 px.

### V6. The frame rate meter counts frames per second

- Before 1 s has passed, the meter reads 0.
- With a tick every 1000/60 ms for 2 s, the meter reads 60 after the first second.
- After 1 s at 60 fps and then 1 s at 30 fps, the meter reads 30, and it reports that the rate is below the expected rate.
- With a tick every 1000/30 ms from the start, the meter reports that the rate is below the expected 60 fps.
- Before 1 s has passed, the meter does not report that the rate is below the expected rate.
- After 1 s at 60 fps and then 1 s at 55 fps, the meter reports that the rate is not below the expected rate, because 55 is at least 90 percent of the target of 60.
- With a tick every 1000/30 ms for 2 s, the meter reads 30 after the first second.

### V7. The test source settings and generator match the server

- V7.1. With the default settings, one batch parses to 1,000 integers.
- With no query, the settings are a rate of 20,000, an interval of 50 ms, and a max value of 10,000.
- With `?rate=100000000&interval=1000&max=1`, the settings hold those values.
- With `rate=0`, `rate=100000001`, or `rate=abc`, the rate takes its default, and the console gets a warning that names `rate`.
- With `interval=49` or `interval=1001`, the interval takes its default, and the console gets a warning that names `interval`.
- With `max=0` or `max=10001`, the max value takes its default, and the console gets a warning that names `max`.
- With a rate of 1 and a 50 ms interval, 20 calls in a row give 19 nulls and one batch of 1 integer.
- With a rate of 30 and a 50 ms interval, 20 calls in a row give 30 integers in total.
- With a max value of 3 and 100,000 samples, every value is from 0 to 2, and each of 0, 1, and 2 appears at least once.
- With a max value of 1, every value is 0.
- The test source service parses the string "[17,8]" from a fake worker and applies it, so with N = 4 cells <0,0> and <1,3> each hold 1. The service then posts an ack to the worker.
- The worker queue sends the first batch at once and holds the next batches until an ack. With 4 batches pushed before any ack, the main thread gets the 1st, 3rd, and 4th, so the queue dropped the 2nd.

### V8. The renderer draws the grid, and the components show the scale

The renderer tests use a fake 2D context that records each fill.

- With N = 4 and the example input from V3.1, the renderer fills cell <0,3> with rgb(30,0,255), cell <2,2> with rgb(255,0,51), and each empty cell with white.
- After the example input, the color scale component shows the labels 10, 5.5, and 1 from top to bottom.
- With no data, the color scale component shows no labels, and the renderer fills every cell with white.
- The renderer writes the row labels 0 to 3 on the left and the column labels 0 to 3 along the bottom for N = 4.
- The heat map component calls the renderer on a frame when `store.frame` returns true, and does not call it when `store.frame` returns false.

### V9. The side panel changes N and shows the readouts

- The page header shows "Bin There, Done That".
- The N field shows "32 × 32" at start.
- A click on the plus button shows "33 × 33" and sets the samples received to 0.
- The minus button is hidden at N = 1, and the plus button is hidden at N = 100. Neither button has the disabled attribute.
- At N = 2, a click on the minus button hides it, and at N = 99, a click on the plus button hides it.
- In the N field, ArrowUp adds 1, Shift+ArrowUp adds 10, and ArrowDown takes away 1.
- After 1,024 samples, the samples received readout shows "1,024".
- The frame rate readout shows the meter value with the unit "fps".
- When the meter reads 30, the panel shows the line "Below the expected 60 fps" below the frame rate, with the class that sets the color to --danger-text.
- When the reading is back at 60, the line is gone.

### V10. Linters pass

- ESLint and Prettier pass on frontend/. The expected result is exit code 0.

### V11. The production build passes

- The build exits with code 0, and the output has a separate chunk for the worker.

## Manual checks

### M1. The page matches the brief and the HTML design

1. Run `make frontend` and open http://localhost:4200.
2. Open context/Bin There Done That.html in a second window.
3. The expected result is the header, the side panel, the fonts, and the colors of the HTML design. The grid fills with color, the samples received readout rises, and the frame rate is near the refresh rate of the display.
4. The expected result also has row labels 0, 2, and so on to 30 on the left, column labels along the bottom, and a scale on the right from blue at 1 to red at the max count. The HTML design has none of these labels.

### M2. The N control works at its limits

1. Click the plus button until N is 100.
2. The expected result is that the plus button is hidden, the field does not move, the counts reset on each click, and the axis labels appear at every 4th row and column.
3. Click the minus button until N is 1.
4. The expected result is that the minus button is hidden, the field does not move, and the one cell is the red end color #FF0033, because its count is the max count.

### M3. Stress test the browser

1. Run `make frontend` and open the page in Chrome with Energy Saver off. Set N to 64 in each step below.
2. Open http://localhost:4200/?rate=100000 and note the frame rate after 10 s. The expected result is a frame rate within 5 fps of the display refresh rate.
3. Repeat step 2 with `rate=1000000`, `rate=5000000`, `rate=10000000`, and `rate=100000000`. Note the frame rate for each. The expected result is a number for each rate, which goes into the Results section. When the frame rate falls below 54 fps, the expected result is a red line below the frame rate that reads "Below the expected 60 fps".
4. Open http://localhost:4200/?rate=abc. The expected result is a console warning that names `rate`, and a stream at 20,000 samples per second.

### M4. The README and the logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the frontend feature.
3. Open README.md.
4. The expected result is that it describes the client, lists the `rate`, `interval`, and `max` query settings with their defaults and ranges, and gives a stress test URL.

## Results (2026-09-30)

The validate step changed two things at the user's request before the final run. The expected frame rate is now a fixed 60 fps instead of the peak since load, and the test source rate limit is now 100,000,000. The V6, V7, V9, and M3 checks above show the new cases. The results below are from the final run.

### Automated checks

- V1 to V9 pass. `make test` passes 71 frontend tests in 15 files and 36 backend tests. Each case listed above has a matching test.
- V10 passes. `make lint` exits with code 0.
- V11 passes. `npx ng build` exits with code 0, and the output has the separate worker chunk worker-FGOCIK6W.js.

### Manual checks

- M1 passes. The user confirmed that the page matches the brief and the HTML design.
- M2 passes. The user confirmed that the N control works at 1 and at 64.
- M3 passes. The test ran in Chrome with Energy Saver off at N = 64. The frame rate was 60 fps at 100,000, 5,000,000, and 10,000,000 samples per second. It was 23 fps at 100,000,000. The user found the limit near 40,000,000 samples per second. The user did not report a separate number for 1,000,000.
- M4 passes. The user confirmed that the README and the three logs record the feature.

### Requirement coverage

Each item from R1 to R14 has at least one passing check.
