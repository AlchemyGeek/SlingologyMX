import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Gauge, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface CounterHistoryDetailProps {
  counterHistory: any;
  onClose: () => void;
}

const CounterHistoryDetail = ({ counterHistory, onClose }: CounterHistoryDetailProps) => {
  const hasValue = (val: any) => val !== null && val !== undefined && val !== 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Counter Update
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700"
                >
                  Counter
                </Badge>
                {counterHistory.source && (
                  <Badge variant="secondary">{counterHistory.source}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Change Date
            </h3>
            <p className="font-medium text-lg">
              {format(new Date(counterHistory.change_date), "PPP p")}
            </p>
          </div>

          <Separator />

          {/* Counter Values */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Counter Values
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className={hasValue(counterHistory.hobbs) ? "border-primary/50" : "opacity-60"}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Hobbs</p>
                    <p className="text-3xl font-bold">
                      {counterHistory.hobbs ?? "-"}
                    </p>
                    {hasValue(counterHistory.hobbs) && (
                      <p className="text-xs text-muted-foreground mt-1">hours</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={hasValue(counterHistory.tach) ? "border-primary/50" : "opacity-60"}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Tach</p>
                    <p className="text-3xl font-bold">
                      {counterHistory.tach ?? "-"}
                    </p>
                    {hasValue(counterHistory.tach) && (
                      <p className="text-xs text-muted-foreground mt-1">hours</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={hasValue(counterHistory.airframe_total_time) ? "border-primary/50" : "opacity-60"}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Airframe Total Time</p>
                    <p className="text-3xl font-bold">
                      {counterHistory.airframe_total_time ?? "-"}
                    </p>
                    {hasValue(counterHistory.airframe_total_time) && (
                      <p className="text-xs text-muted-foreground mt-1">hours</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={hasValue(counterHistory.engine_total_time) ? "border-primary/50" : "opacity-60"}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Engine Total Time</p>
                    <p className="text-3xl font-bold">
                      {counterHistory.engine_total_time ?? "-"}
                    </p>
                    {hasValue(counterHistory.engine_total_time) && (
                      <p className="text-xs text-muted-foreground mt-1">hours</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={hasValue(counterHistory.prop_total_time) ? "border-primary/50" : "opacity-60"}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Prop Total Time</p>
                    <p className="text-3xl font-bold">
                      {counterHistory.prop_total_time ?? "-"}
                    </p>
                    {hasValue(counterHistory.prop_total_time) && (
                      <p className="text-xs text-muted-foreground mt-1">hours</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Source */}
          {counterHistory.source && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Source</h3>
                <p className="text-muted-foreground">{counterHistory.source}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Record ID</p>
                <p className="font-medium font-mono text-xs">{counterHistory.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {counterHistory.created_at
                    ? format(new Date(counterHistory.created_at), "PPP p")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CounterHistoryDetail;
