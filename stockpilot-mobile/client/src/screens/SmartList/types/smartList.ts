export type ListAlgorithm = {
  id: string;
  title: string;
  description: string;
};

export type ListSection = {
  id: string;
  title: string;
  algorithms: ListAlgorithm[];
};
