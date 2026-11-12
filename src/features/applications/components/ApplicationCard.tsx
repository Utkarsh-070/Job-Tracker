export function CompanyInitial({ company }: { company: string }) {
  return (
    <span aria-hidden="true" className="company-initial">
      {Array.from(company.trim())[0]?.toLocaleUpperCase() || "?"}
    </span>
  );
}
