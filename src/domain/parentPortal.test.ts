import { describe, it, expect } from 'vitest';
import { 
  calculateParentPayment, 
  getCurrentRoutineStage, 
  generateVacationApplicationText,
  ROUTINE_STAGES 
} from './parentPortal';

describe('parentPortal domain logic', () => {
  describe('calculateParentPayment', () => {
    it('calculates full payment for nursery without discount', () => {
      const res = calculateParentPayment(20, 'nursery', 'none');
      expect(res.dailyRate).toBe(45.0);
      expect(res.rawTotal).toBe(900.0);
      expect(res.discountPercent).toBe(0);
      expect(res.discountAmount).toBe(0);
      expect(res.finalTotal).toBe(900.0);
    });

    it('calculates full payment for kindergarten without discount', () => {
      const res = calculateParentPayment(20, 'kindergarten', 'none');
      expect(res.dailyRate).toBe(65.0);
      expect(res.rawTotal).toBe(1300.0);
      expect(res.discountPercent).toBe(0);
      expect(res.discountAmount).toBe(0);
      expect(res.finalTotal).toBe(1300.0);
    });

    it('applies 50% discount for large families', () => {
      const res = calculateParentPayment(22, 'kindergarten', 'large_family_50');
      expect(res.rawTotal).toBe(1430.0);
      expect(res.discountPercent).toBe(50);
      expect(res.discountAmount).toBe(715.0);
      expect(res.finalTotal).toBe(715.0);
    });

    it('applies 100% discount for VPO / UBD / defenders children', () => {
      const res = calculateParentPayment(21, 'nursery', 'full_100_vpo_ubd');
      expect(res.rawTotal).toBe(945.0);
      expect(res.discountPercent).toBe(100);
      expect(res.discountAmount).toBe(945.0);
      expect(res.finalTotal).toBe(0.0);
    });

    it('handles 0 or negative days gracefully', () => {
      const res = calculateParentPayment(-5, 'kindergarten', 'none');
      expect(res.rawTotal).toBe(0);
      expect(res.finalTotal).toBe(0);
    });
  });

  describe('getCurrentRoutineStage', () => {
    it('identifies morning reception at 07:45', () => {
      const stage = getCurrentRoutineStage('07:45');
      expect(stage).not.toBeNull();
      expect(stage?.id).toBe('morning_reception');
    });

    it('identifies breakfast at 09:00', () => {
      const stage = getCurrentRoutineStage('09:00');
      expect(stage).not.toBeNull();
      expect(stage?.id).toBe('breakfast');
    });

    it('identifies lunch at 12:20', () => {
      const stage = getCurrentRoutineStage('12:20');
      expect(stage).not.toBeNull();
      expect(stage?.id).toBe('lunch');
    });

    it('identifies quiet hour at 13:45', () => {
      const stage = getCurrentRoutineStage('13:45');
      expect(stage).not.toBeNull();
      expect(stage?.id).toBe('quiet_hour');
    });

    it('identifies afternoon snack at 15:45', () => {
      const stage = getCurrentRoutineStage('15:45');
      expect(stage).not.toBeNull();
      expect(stage?.id).toBe('afternoon_snack');
    });

    it('returns null during non-working night hours (e.g. 21:00)', () => {
      const stage = getCurrentRoutineStage('21:00');
      expect(stage).toBeNull();
    });

    it('contains all 12 key stages in routine', () => {
      expect(ROUTINE_STAGES.length).toBe(12);
    });
  });

  describe('generateVacationApplicationText', () => {
    it('generates text with director Pavlukhina and institution details', () => {
      const text = generateVacationApplicationText({
        parentFullName: 'Іваненко Олена Петрівна',
        childFullName: 'Іваненко Максим',
        groupName: 'Сонечко',
        fromDate: '01.07.2026',
        toDate: '31.08.2026',
        reason: 'літнє сімейне оздоровлення',
        date: '2026-06-25',
        phone: '+380671234567'
      });

      expect(text).toContain('Павлухіній Наталії Григорівні');
      expect(text).toContain('№ 145');
      expect(text).toContain('Іваненко Олена Петрівна');
      expect(text).toContain('Іваненко Максим');
      expect(text).toContain('«Сонечко»');
      expect(text).toContain('01.07.2026');
      expect(text).toContain('31.08.2026');
      expect(text).toContain('+380671234567');
      expect(text).toContain('медичну довідку встановленого зразка');
    });
  });
});
