import { getAttributePanelView } from "./attribute-panel-selector.js";
import { getMainPanelView } from "./main-panel-selector.js";
import { PANEL_VIEW_SCHEMA_VERSION } from "./selector-utils.js";
import { getStoryPanelView } from "./story-panel-selector.js";

export { getAttributePanelView } from "./attribute-panel-selector.js";
export { getMainPanelView } from "./main-panel-selector.js";
export { getStoryPanelView } from "./story-panel-selector.js";

export function buildPanelViews(run) {
  return {
    schemaVersion: PANEL_VIEW_SCHEMA_VERSION,
    main: getMainPanelView(run),
    attributes: getAttributePanelView(run),
    story: getStoryPanelView(run),
  };
}
