import { NODE_KINDS } from './types';
import { predicateToString } from './predicates';

export const formatNode = (node) => {
  switch (node.kind) {
    case NODE_KINDS.BASE:
      return node.alias ?? node.relationName;
    case NODE_KINDS.SELECT:
      return `σ_{${predicateToString(node.predicate)}}(${formatNode(node.input)})`;
    case NODE_KINDS.PROJECT:
      return `π_{${node.columns.join(', ')}}(${formatNode(node.input)})`;
    case NODE_KINDS.UNION:
      return `(${formatNode(node.left)} ∪ ${formatNode(node.right)})`;
    case NODE_KINDS.INTERSECTION:
      return `(${formatNode(node.left)} ∩ ${formatNode(node.right)})`;
    case NODE_KINDS.DIFFERENCE:
      return `(${formatNode(node.left)} − ${formatNode(node.right)})`;
    case NODE_KINDS.PRODUCT:
      return `(${formatNode(node.left)} × ${formatNode(node.right)})`;
    case NODE_KINDS.JOIN:
      return `(${formatNode(node.left)} ⋈ ${formatNode(node.right)})`;
    case NODE_KINDS.DIVISION:
      return `(${formatNode(node.dividend)} ÷ ${formatNode(node.divisor)})`;
    default:
      return '?';
  }
};
