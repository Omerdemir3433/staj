import StaffDashboard from "@/components/dashboard/StaffDashboard";

export default function BirimMuduruDashboardPage() {
  return (
    <StaffDashboard
      title="Birim Yönetici Paneli"
      detailBasePath="/dashboard/birim-muduru/basvurular"
      requiredRole="UNIT_MANAGER"
      showStaffList
      showAdminActions
    />
  );
}
