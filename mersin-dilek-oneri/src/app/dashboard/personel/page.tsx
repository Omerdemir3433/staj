import StaffDashboard from "@/components/dashboard/StaffDashboard";

export default function PersonelDashboardPage() {
  return (
    <StaffDashboard
      title="Personel Yönetim Paneli"
      detailBasePath="/dashboard/personel/basvurular"
    />
  );
}
