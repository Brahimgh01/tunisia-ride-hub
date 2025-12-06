import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Driver {
  user_id: string;
  driver_id: string;
  full_name: string;
  phone: string;
  city: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  license_plate_number?: string;
  is_verified?: boolean;
  is_available?: boolean;
  id_document_front_url?: string;
  id_document_back_url?: string;
  license_document_url?: string;
  vehicle_registration_document_url?: string;
}

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    // Get users with driver role from user_roles table
    const { data: driverRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'driver');

    if (!driverRoles || driverRoles.length === 0) {
      setDrivers([]);
      return;
    }

    const driverUserIds = driverRoles.map(r => r.user_id);

    // Get profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone, city')
      .in('user_id', driverUserIds);

    if (profiles) {
      // Get all driver profiles in one query
      const { data: driverProfiles } = await supabase
        .from('driver_profiles')
        .select('*')
        .in('driver_id', driverUserIds);

      const driversWithDetails = profiles.map((profile) => {
        const driverProfile = driverProfiles?.find(dp => dp.driver_id === profile.user_id);
        return { ...profile, ...driverProfile, driver_id: profile.user_id };
      });
      setDrivers(driversWithDetails as Driver[]);
    }
  };

  const handleVerifyDriver = async (driverId: string, verify: boolean) => {
    const { error } = await supabase
      .from('driver_profiles')
      .update({ is_verified: verify })
      .eq('driver_id', driverId);

    if (error) {
      toast.error(`Failed to ${verify ? 'verify' : 'unverify'} driver`);
      console.error(error);
    } else {
      toast.success(`Driver ${verify ? 'verified' : 'unverified'} successfully`);
      fetchDrivers();
    }
  };

  const openDriverDetails = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDetailsDialog(true);
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No drivers found
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.user_id}>
                  <TableCell>{driver.full_name}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>{driver.city}</TableCell>
                  <TableCell>
                    {driver.vehicle_type || 'N/A'} {driver.vehicle_model}
                    {driver.license_plate_number && <div className="text-xs text-muted-foreground">{driver.license_plate_number}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={driver.is_verified ? 'default' : 'secondary'}>
                      {driver.is_verified ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Not Verified</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={driver.is_available ? 'default' : 'outline'}>
                      {driver.is_available ? 'Online' : 'Offline'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDriverDetails(driver)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!driver.is_verified ? (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyDriver(driver.driver_id || driver.user_id, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerifyDriver(driver.driver_id || driver.user_id, false)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Unverify
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Driver Details Dialog */}
    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Driver Details</DialogTitle>
          <DialogDescription>
            Review driver information and documents
          </DialogDescription>
        </DialogHeader>
        {selectedDriver && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">{selectedDriver.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{selectedDriver.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium">City</p>
                <p className="text-sm text-muted-foreground">{selectedDriver.city}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Vehicle</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDriver.vehicle_type} {selectedDriver.vehicle_model} ({selectedDriver.vehicle_color})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">License Plate</p>
                <p className="text-sm text-muted-foreground">{selectedDriver.license_plate_number || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Documents</h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedDriver.id_document_front_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">ID Front</p>
                    <img src={selectedDriver.id_document_front_url} alt="ID Front" className="rounded border w-full" />
                  </div>
                )}
                {selectedDriver.id_document_back_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">ID Back</p>
                    <img src={selectedDriver.id_document_back_url} alt="ID Back" className="rounded border w-full" />
                  </div>
                )}
                {selectedDriver.license_document_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">Driver License</p>
                    <img src={selectedDriver.license_document_url} alt="License" className="rounded border w-full" />
                  </div>
                )}
                {selectedDriver.vehicle_registration_document_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">Vehicle Registration</p>
                    <img src={selectedDriver.vehicle_registration_document_url} alt="Registration" className="rounded border w-full" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
