figma.on("run", async () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Please select at least one frame or rectangle.");
    figma.closePlugin();
    return;
  }

  // Get or create a local variable collection
  const variableCollections =
    await figma.variables.getLocalVariableCollectionsAsync();
  let variableCollection = variableCollections[0];
  if (!variableCollection) {
    variableCollection =
      figma.variables.createVariableCollection("Local Variables");
  }

  // Get or create a mode
  let modeId = variableCollection.modes[0]?.modeId;
  if (!modeId) {
    variableCollection.addMode("Mode 1");
    modeId = variableCollection.modes[0].modeId;
  }

  let successCount = 0;

  for (const item of selection) {
    // Check if the item is a Frame or Rectangle
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
      const opacity = firstFill.opacity !== undefined ? firstFill.opacity : 1;

      // Define the variable name, using the node's name or a unique ID
      const variableName = node.name || `Color Variable ${node.id}`;

      // Check if a variable with the same name exists
      const variables = await figma.variables.getLocalVariablesAsync();
      let variable = variables.find((v) => v.name === variableName);

      if (!variable) {
        // Create a new variable if it doesn't exist
        variable = figma.variables.createVariable(
          variableName,
          await figma.variables.getVariableCollectionByIdAsync(
            variableCollection.id
          ),
          "COLOR"
        );
      }

      // Set the value for the mode
      variable.setValueForMode(modeId, {
        r: color.r,
        g: color.g,
        b: color.b,
        a: opacity,
      });

      successCount++;
    } else {
      // Skip items that are not frames or rectangles
      continue;
    }
  }

  if (successCount > 0) {
    figma.notify(`${successCount} color variable(s) added successfully.`);
  } else {
    figma.notify(`NO valid frames or rectangles selected.`);
  }

  figma.closePlugin();
});
