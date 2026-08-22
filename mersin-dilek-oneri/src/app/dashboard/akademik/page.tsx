import InternalUserDashboard from "@/components/dashboard/InternalUserDashboard";

export default function AcademicDashboardPage() {
  return (
    <InternalUserDashboard
      title="Akademisyen Paneli"
      detailBasePath="/dashboard/akademik/basvurular"
      redirectPath="/ogrenci-akademisyen-giris"
    />
  );
}
