import CustomNode from './CustomNode';
import ShapeNode from './ShapeNode';
import TextNode from './TextNode';
import StickyNode from './StickyNode';
import FreehandNode from './FreehandNode';

export const diagramNodeTypes = {
  custom: CustomNode,
  shape: ShapeNode,
  text: TextNode,
  sticky: StickyNode,
  freehand: FreehandNode,
};
