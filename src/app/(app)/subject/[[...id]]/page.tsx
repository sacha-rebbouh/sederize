import SubjectPageClient from './subject-page-client';

// Required for static export with optional catch-all
// Returns the base /subject route (no params)
export function generateStaticParams() {
  return [{ id: [] }];
}

export default function SubjectPage() {
  return <SubjectPageClient />;
}
