import { DB } from './db.js';
import { roomById, guestById, getGuestName } from './lookup.js';
import { fmtMoney as _fmtM, nightsBetween as _nB } from './utils.js';

export function channelLabel(ch){
  const channels = DB.channels || [];
  const found = channels.find(c => c.id === ch);
  return found ? found.name : (ch || 'Directo / Walk-in');
}

export const channelUsesOtaPricing = (ch) => {
  const channels = DB.channels || [];
  const found = channels.find(c => c.id === ch);
  return found ? found.usesOtaPricing : false;
};

export function effectiveNightRateForReservation(rm, channel, channelNightPrice){
  const base = rm ? (parseFloat(rm.price)||0) : 0;
  if (channelUsesOtaPricing(channel) && channelNightPrice != null && !isNaN(parseFloat(channelNightPrice)) && parseFloat(channelNightPrice) > 0)
    return parseFloat(channelNightPrice);
  return base;
}

export function stayNightRate(stay, rm){
  if (stay && stay.nightPrice != null && !isNaN(parseFloat(stay.nightPrice)) && parseFloat(stay.nightPrice) > 0)
    return parseFloat(stay.nightPrice);
  return rm ? (parseFloat(rm.price)||0) : 0;
}

export function receiptKeyDepositNote(p){
  if(!p)return '';
  const c=(p.concept||'').toLowerCase();
  if(p.payClass==='ingreso_deposito')return 'Depósito llave: cobrado al check-in (custodia del establecimiento).';
  if(p.payClass==='egreso_deposito'){
    if(c.indexOf('aplicado al saldo')!==-1||c.indexOf('aplicado')!==-1)return 'Depósito llave: aplicado a liquidación de cuenta / saldo pendiente.';
    if(c.indexOf('sobrante')!==-1)return 'Depósito llave: devolución parcial (sobrante tras aplicar a cuenta).';
    return 'Depósito llave: devuelto al huésped al salir.';
  }
  if(p.payClass==='ingreso'&&c.indexOf('depósito llave aplicado')!==-1)return 'Depósito llave: valor aplicado como pago a la cuenta (liquidación).';
  return '';
}

export const stayAccountExtrasTotal = (stay) => {
  let x=0;
  if(!stay||!stay.accountExtras) return 0;
  for(let i=0;i<stay.accountExtras.length;i++) x+=parseFloat(stay.accountExtras[i].amount||0);
  return x;
};

export const stayOpenAccountConsumos = (stay) => {
  let s=0;
  if(stay&&stay.services) for(let i=0;i<stay.services.length;i++) s+=parseFloat(stay.services[i].price||0);
  return s;
};

export const stayOpenAccountTotal = (stay) => stayOpenAccountConsumos(stay)+stayAccountExtrasTotal(stay);

export function stayIngresoPaymentsTotalForStay(stayId){
  let t=0;
  for(let i=0;i<DB.payments.length;i++){
    const p=DB.payments[i];
    if(p.stayId===stayId&&p.payClass==='ingreso') t+=parseFloat(p.amount||0);
  }
  return t;
}

export function stayCheckoutBalanceBreakdown(stay,checkoutDate){
  const rm=roomById(stay.roomId);
  const nights=_nB(stay.checkIn,checkoutDate);
  const nightR=stayNightRate(stay,rm);
  const roomCost=nights*nightR;
  const openAcc=stayOpenAccountTotal(stay);
  const grand=roomCost+openAcc;
  const paid=stayIngresoPaymentsTotalForStay(stay.id);
  const paidRoom=Math.min(paid,roomCost);
  const roomRemainder=Math.max(0,roomCost-paidRoom);
  const paidOpen=Math.max(0,paid-roomCost);
  const openRemainder=Math.max(0,openAcc-paidOpen);
  const balance=Math.max(0,grand-paid);
  return {nights,nightR,roomCost,openAcc,grandTotal:grand,totalPaid:paid,paidRoom,paidOpen,roomRemainder,openRemainder,balance};
}

export function validateCheckinPayments(keyDep,kdRequired,roomDeposit,estimatedTotal){
  kdRequired=parseFloat(kdRequired)||0;
  keyDep=parseFloat(keyDep)||0;
  roomDeposit=parseFloat(roomDeposit)||0;
  estimatedTotal=Math.max(0,parseFloat(estimatedTotal)||0);
  const half=estimatedTotal*0.5;
  if(kdRequired>0&&keyDep+0.001<kdRequired)return 'Debe cobrarse el depósito de llave completo ('+_fmtM(kdRequired)+').';
  if(estimatedTotal>0&&roomDeposit+0.01<half)return 'Debe cobrarse al menos el 50% del total de la estadía ('+_fmtM(half)+') o el total ('+_fmtM(estimatedTotal)+'). Actual: '+_fmtM(roomDeposit)+'.';
  return '';
}

export function reservationSummaryForAudit(r){
  if(!r) return '';
  const rm=roomById(r.roomId);
  const np=(r.nightPrice!=null&&parseFloat(r.nightPrice)>0)?parseFloat(r.nightPrice):null;
  return 'Hab. '+(rm?rm.number:r.roomId)+' · '+r.checkIn+'→'+r.checkOut+' · Estado '+(r.status||'—')+(np!=null?(' · Tarifa '+_fmtM(np)+'/n'):'');
}

export function reservationChangeDetails(oldR,newR){
  const changes=[];
  if(oldR.roomId!==newR.roomId){
    const oldRm=roomById(oldR.roomId), newRm=roomById(newR.roomId);
    changes.push('habitación: '+(oldRm?oldRm.number:oldR.roomId)+' → '+(newRm?newRm.number:newR.roomId));
  }
  if(oldR.checkIn!==newR.checkIn) changes.push('check-in: '+oldR.checkIn+' → '+newR.checkIn);
  if(oldR.checkOut!==newR.checkOut) changes.push('check-out: '+oldR.checkOut+' → '+newR.checkOut);
  if(String(oldR.persons||'')!==String(newR.persons||'')) changes.push('personas: '+(oldR.persons||0)+' → '+(newR.persons||0));
  if((oldR.status||'')!==(newR.status||'')) changes.push('estado: '+(oldR.status||'—')+' → '+(newR.status||'—'));
  if((oldR.channel||'')!==(newR.channel||'')) changes.push('canal: '+channelLabel(oldR.channel)+' → '+channelLabel(newR.channel));
  const oldNP=(oldR.nightPrice!=null&&parseFloat(oldR.nightPrice)>0)?parseFloat(oldR.nightPrice):null;
  const newNP=(newR.nightPrice!=null&&parseFloat(newR.nightPrice)>0)?parseFloat(newR.nightPrice):null;
  if(oldNP!==newNP) changes.push('tarifa/noche: '+(oldNP!=null?_fmtM(oldNP):'Automática')+' → '+(newNP!=null?_fmtM(newNP):'Automática'));
  if(parseFloat(oldR.totalEstimated||0)!==parseFloat(newR.totalEstimated||0)) changes.push('total: '+_fmtM(oldR.totalEstimated||0)+' → '+_fmtM(newR.totalEstimated||0));
  return changes;
}

window.channelLabel = channelLabel;
window.channelUsesOtaPricing = channelUsesOtaPricing;
window.effectiveNightRateForReservation = effectiveNightRateForReservation;
window.stayNightRate = stayNightRate;
window.receiptKeyDepositNote = receiptKeyDepositNote;
window.stayAccountExtrasTotal = stayAccountExtrasTotal;
window.stayOpenAccountConsumos = stayOpenAccountConsumos;
window.stayOpenAccountTotal = stayOpenAccountTotal;
window.stayIngresoPaymentsTotalForStay = stayIngresoPaymentsTotalForStay;
window.stayCheckoutBalanceBreakdown = stayCheckoutBalanceBreakdown;
window.validateCheckinPayments = validateCheckinPayments;
window.reservationSummaryForAudit = reservationSummaryForAudit;
window.reservationChangeDetails = reservationChangeDetails;
