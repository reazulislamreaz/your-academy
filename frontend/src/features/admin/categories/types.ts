export type CategoryScope = 'PRELIMINARY' | 'WRITTEN';

export type AdminCategoryChild = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  scope?: CategoryScope;
  questionCount: number;
  practiceSetCount: number;
  documentCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminCategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  scope?: CategoryScope;
  subcategoryCount: number;
  questionCount: number;
  practiceSetCount: number;
  documentCount: number;
  children: AdminCategoryChild[];
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  scope?: CategoryScope;
  isActive: boolean;
  sortOrder: number;
};
