import { describe, expect, it, beforeEach } from 'vitest';
import { SadokChild, ChildGroupTransferItem } from '../types';

describe('mass transfer ("1 Вересня") business rules', () => {
  const sampleChildren: SadokChild[] = [
    {
      ID: 1,
      FULL_NAME: 'Петренко Іван Олексійович',
      BIRTH_DATE: '2020-04-12',
      GENDER: 'Чоловіча',
      GROUP_NAME: 'Група «Сонечко» (Ясельна)',
      STATUS: 'Навчається',
      BENEFIT_CATEGORY: 'Загальна підстава',
      PARENT_NAME: 'Петренко О. В.',
      PARENT_PHONE: '+380671112233'
    },
    {
      ID: 2,
      FULL_NAME: 'Ковальчук Марія Іванівна',
      BIRTH_DATE: '2019-08-25',
      GENDER: 'Жіноча',
      GROUP_NAME: 'Група «Ромашка» (Старша)',
      STATUS: 'Навчається',
      BENEFIT_CATEGORY: 'Багатодітна родина',
      PARENT_NAME: 'Ковальчук І. М.',
      PARENT_PHONE: '+380672223344'
    }
  ];

  it('correctly transitions younger children to the next age group', () => {
    const transfers: ChildGroupTransferItem[] = [
      {
        childId: 1,
        targetGroupName: 'Група «Дзвіночок» (Молодша)',
        targetStatus: 'Навчається'
      }
    ];

    const transferMap = new Map(transfers.map(t => [t.childId, t]));
    const result = sampleChildren.map(c => {
      const t = transferMap.get(c.ID);
      if (!t) return c;
      return {
        ...c,
        GROUP_NAME: t.targetGroupName,
        STATUS: t.targetStatus || c.STATUS
      };
    });

    expect(result[0].GROUP_NAME).toBe('Група «Дзвіночок» (Молодша)');
    expect(result[0].STATUS).toBe('Навчається');
    expect(result[1].GROUP_NAME).toBe('Група «Ромашка» (Старша)');
  });

  it('graduates senior group children to school archive', () => {
    const transfers: ChildGroupTransferItem[] = [
      {
        childId: 2,
        targetGroupName: 'Випускники до школи (Архів)',
        targetStatus: 'Випускник'
      }
    ];

    const transferMap = new Map(transfers.map(t => [t.childId, t]));
    const result = sampleChildren.map(c => {
      const t = transferMap.get(c.ID);
      if (!t) return c;
      return {
        ...c,
        GROUP_NAME: t.targetGroupName,
        STATUS: t.targetStatus || c.STATUS
      };
    });

    expect(result[1].STATUS).toBe('Випускник');
    expect(result[1].GROUP_NAME).toBe('Випускники до школи (Архів)');
  });
});
