# Try a decision in five minutes

Start the local server with `npm start` and open http://localhost:3000. Click **Explore the launch model** to jump to its run control.

1. Run the example with seed 12345. Compare net value with unresolved failures, rather than relying on net value alone. The values are illustrative model outputs.
2. Set reliability to 80% and run again. Inspect the differences between full release, a reviewed pilot, and a delayed/reliability investment. Look at the reliability row in sensitivity.
3. Restore example inputs. Open the workbench editor, give the decision a title and question, and enter a task value that reflects your own context.
4. Record evidence for reliability, such as a representative evaluation result and its date. Set confidence as descriptive metadata. Apply changes and rerun.
5. Save the applied model, export model JSON, and export the decision brief. To reproduce it elsewhere, import JSON, use its seed, and run again.

**Read the disclosure:** the equations, uncertainty distributions, policy assumptions, and limitations are under “Inside the model.” These are planning assumptions, not calibrated predictions. Confidence does not change the sampled uncertainty.

On phones, swipe the map or use **Select a map node**. Comparison tables scroll horizontally within their own panels. Keyboard users can Tab through controls and map nodes, activate nodes with Enter/Space, adjust sliders with arrow keys, and dismiss the roadmap dialog with Escape.

If you edit the model and running becomes disabled, apply or discard the draft. If the seed is invalid, use a whole number from 0 to 4294967295. If import fails, the previous model remains available. If storage is blocked or full, export JSON to keep a copy. Models save under their exact title; saving the same title replaces its saved version.
