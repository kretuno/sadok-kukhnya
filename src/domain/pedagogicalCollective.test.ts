import { describe, it, expect } from 'vitest';
import {
  PEDAGOGICAL_COLLECTIVE,
  PEDAGOGICAL_DEPARTMENTS,
  getStaffByDepartment,
  searchStaff,
  getStaffStats
} from './pedagogicalCollective';

describe('pedagogicalCollective domain', () => {
  it('contains the full roster of 28 pedagogical staff members from KZDO №145', () => {
    expect(PEDAGOGICAL_COLLECTIVE.length).toBe(28);
  });

  it('has valid non-empty fields for each staff member', () => {
    PEDAGOGICAL_COLLECTIVE.forEach(member => {
      expect(member.id).toBeTruthy();
      expect(member.fullName).toBeTruthy();
      expect(member.position).toBeTruthy();
      expect(member.department).toMatch(/^(administration|specialists|special_groups|general_groups)$/);
      expect(member.education).toBeTruthy();
      expect(member.qualificationCategory).toBeTruthy();
      expect(member.experienceYears).toBeGreaterThanOrEqual(1);
      expect(member.experience).toBeTruthy();
      expect(member.credo).toBeTruthy();
      expect(member.photoUrl).toMatch(/^https:\/\/static\.wixstatic\.com\/media\//);
      expect(member.originalProfileUrl).toBeTruthy();
    });
  });

  it('correctly filters by department', () => {
    const admin = getStaffByDepartment('administration');
    expect(admin.length).toBe(2);
    expect(admin.some(m => m.fullName.includes('Павлухіна'))).toBe(true);
    expect(admin.some(m => m.fullName.includes('Єфімова'))).toBe(true);

    const specialists = getStaffByDepartment('specialists');
    expect(specialists.length).toBe(11);
    expect(specialists.some(m => m.fullName.includes('Дерипаска'))).toBe(true);
    expect(specialists.some(m => m.fullName.includes('Біла'))).toBe(true);
    expect(specialists.some(m => m.fullName.includes('Бортнікова'))).toBe(true);

    const specialGroups = getStaffByDepartment('special_groups');
    expect(specialGroups.length).toBe(9);
    expect(specialGroups.some(m => m.fullName.includes('Жир'))).toBe(true);

    const generalGroups = getStaffByDepartment('general_groups');
    expect(generalGroups.length).toBe(6);
    expect(generalGroups.some(m => m.fullName.includes('Ковальова'))).toBe(true);

    const all = getStaffByDepartment('all');
    expect(all.length).toBe(28);
  });

  it('searches correctly by name, position and specialty', () => {
    const resultsName = searchStaff('Павлухіна');
    expect(resultsName.length).toBe(1);
    expect(resultsName[0].fullName).toContain('Павлухіна Наталія Георгіївна');

    const logopedists = searchStaff('логопед');
    expect(logopedists.length).toBeGreaterThanOrEqual(4);

    const suhomlynsky = searchStaff('Сухомлинський');
    expect(suhomlynsky.length).toBe(1);
    expect(suhomlynsky[0].fullName).toContain('Ковалевська');

    const filteredWithDept = searchStaff('вихователь', 'general_groups');
    expect(filteredWithDept.length).toBe(6);
  });

  it('computes aggregated staff statistics correctly', () => {
    const stats = getStaffStats();
    expect(stats.total).toBe(28);
    expect(stats.higherCategory).toBeGreaterThan(0);
    expect(stats.avgExp).toBeGreaterThan(15);
    expect(stats.specialistsCount).toBe(11);
    expect(stats.educatorsCount).toBe(15);
  });
});
