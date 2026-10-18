import ArrayListSimulator from './arraylist/ArrayListSimulator';
import HashMapSimulator from './hashmap/HashMapSimulator';
import HierarchyExplorer from './hierarchy/HierarchyExplorer';

export const VISUALIZATIONS = {
  arraylist: ArrayListSimulator,
  hashmap: HashMapSimulator,
  hierarchy: HierarchyExplorer,
} as const;

export type VisualizationId = keyof typeof VISUALIZATIONS;

export default function Visualization({ id }: { id: string }) {
  const Component = VISUALIZATIONS[id as VisualizationId];
  if (!Component) return <p role="alert">Unknown visualization “{id}”.</p>;
  return <Component />;
}
