figma.on("run", async () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Please select at least 1 frame, rectangle, or vector.");
    figma.closePlugin();
    return;
  }

  // Get or create a local variable collection
  const variableCollections =
    await figma.variables.getLocalVariableCollectionsAsync();
  let variableCollection: VariableCollection | null = null;

  if (variableCollections.length === 0) {
    // Create a new variable collection if none exist
    variableCollection =
      figma.variables.createVariableCollection("Local Variables");
  } else {
    variableCollection = variableCollections[0];
  }

  // Ensure variableCollection is not null before proceeding
  if (variableCollection === null) {
    figma.notify("Failed to create or retrieve a variable collection.");
    figma.closePlugin();
    return;
  }

  // Ensure there's at least one mode
  if (variableCollection.modes.length === 0) {
    variableCollection.addMode("Default Mode");
  }

  // Get the updated modes list
  const modes = variableCollection.modes;

  // Show the UI and pass the modes to the UI
  figma.showUI(__html__);

  // Send modes to the UI
  figma.ui.postMessage({
    type: "init",
    modes: modes.map((mode) => ({ name: mode.name, modeId: mode.modeId })),
  });

  // Handle messages from the UI
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "extract-colors") {
      const selectedModeId = msg.modeId;

      // Proceed to extract colors using the selectedModeId
      let successCount = 0;

      // Get variables in the current collection
      const variablesInCollection: Variable[] = [];
      for (const variableId of variableCollection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (variable) {
          variablesInCollection.push(variable);
        }
      }

      for (const item of selection) {
        // Check if the item is a Frame, Rectangle, or Vector
        if (
          item.type === "FRAME" ||
          item.type === "RECTANGLE" ||
          item.type === "VECTOR"
        ) {
          const node = item as GeometryMixin & SceneNode;

          // Check if the node has fills
          if (
            !("fills" in node) ||
            node.fills === figma.mixed ||
            node.fills.length === 0
          ) {
            continue; // Skip nodes without fills
          }

          const fills = node.fills as ReadonlyArray<Paint>;
          const firstFill = fills[0];

          // Check if the first fill is a solid color
          if (firstFill.type !== "SOLID") {
            continue; // Skip nodes where the first fill is not solid
          }

          // Get the color and opacity
          const color = firstFill.color;
          const opacity =
            firstFill.opacity !== undefined ? firstFill.opacity : 1;

          // Define the variable name, using the node's name or a unique ID
          const variableName = node.name || `Color Variable ${node.id}`;

          // Check if a variable with the same name exists in the collection
          let variable = variablesInCollection.find(
            (v) => v.name === variableName
          );

          if (!variable) {
            // Create a new variable if it doesn't exist
            variable = figma.variables.createVariable(
              variableName,
              await figma.variables.getVariableCollectionByIdAsync(
                variableCollection.id
              ),
              "COLOR"
            );

            // Add the new variable to our list
            variablesInCollection.push(variable);
          }

          // Set the value for the selected mode
          // Existing values in other modes remain untouched
          variable.setValueForMode(selectedModeId, {
            r: color.r,
            g: color.g,
            b: color.b,
            a: opacity,
          });

          successCount++;
        } else {
          // Skip items that are not frames, rectangles, or vectors
          continue;
        }
      }

      if (successCount > 0) {
        figma.notify(`${successCount} color variable(s) added successfully.`);
      } else {
        figma.notify(`No valid frames, rectangles, or vectors selected.`);
      }

      figma.closePlugin();
    }
  };
});
