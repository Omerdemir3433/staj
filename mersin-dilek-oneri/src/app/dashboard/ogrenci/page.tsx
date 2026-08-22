import InternalUserDashboard from "@/components/dashboard/InternalUserDashboard";

export default function StudentDashboardPage() {
  return (
    <InternalUserDashboard
      title="Öğrenci Paneli"
      detailBasePath="/dashboard/ogrenci/basvurular"
      redirectPath="/ogrenci-akademisyen-giris"
    />
  );
}
