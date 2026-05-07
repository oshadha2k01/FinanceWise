
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "../../types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TransactionList({ 
  transactions, 
  onDelete 
}: { 
  transactions: Transaction[], 
  onDelete: (id: string) => void 
}) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food': 'bg-amber-100 text-amber-600',
      'Housing': 'bg-blue-100 text-blue-600',
      'Transport': 'bg-purple-100 text-purple-600',
      'Entertainment': 'bg-rose-100 text-rose-600',
      'Shopping': 'bg-indigo-100 text-indigo-600',
      'Salary': 'bg-emerald-100 text-emerald-600',
      'Other': 'bg-slate-100 text-slate-600'
    };
    return colors[category] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">Merchant / Activity</TableHead>
            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">Category</TableHead>
            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3 text-right">Amount</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-slate-400 text-xs font-medium italic">
                No activity recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((t) => (
              <TableRow key={t.id} className="border-slate-50 hover:bg-slate-50/5 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarColor(t.category)}`}>
                      {getInitials(t.description)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{t.description}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {format(new Date(t.date), "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none px-2 py-0.5 text-[10px] font-bold">
                    {t.category}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(t.id)}
                    className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
