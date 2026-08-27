import StaffDashboard from "@/components/dashboard/StaffDashboard";

export default function BirimPersoneliDashboardPage() {
  return (
    <StaffDashboard
      title="Birim Personeli Paneli"
      detailBasePath="/dashboard/birim-personeli/basvurular"
      requiredRole="UNIT_STAFF"
      showClaimButton
    />
  );
}
