import { describe, it, expect } from 'vitest';
import { computeDropTarget, isValidDrop } from './tree-dnd.js';

describe('tree-dnd', () => {
  describe('computeDropTarget', () => {
    it('computes between-siblings target for before position (post-removal index)', () => {
      const target = computeDropTarget(
        ['pages', 0, 'components', 0],
        ['pages', 0, 'components', 1],
        'component',
        'before'
      );
      expect(target.type).toBe('between');
      expect(target.parentPath).toEqual(['pages', 0, 'components']);
      expect(target.index).toBe(0);
    });

    it('computes between-siblings target for after position (post-removal index)', () => {
      const target = computeDropTarget(
        ['pages', 0, 'components', 0],
        ['pages', 0, 'components', 1],
        'component',
        'after'
      );
      expect(target.type).toBe('between');
      expect(target.parentPath).toEqual(['pages', 0, 'components']);
      expect(target.index).toBe(1);
    });

    it('adjusts index when dragging down within same parent', () => {
      const target = computeDropTarget(
        ['pages', 0, 'components', 0],
        ['pages', 0, 'components', 2],
        'component',
        'before'
      );
      expect(target.type).toBe('between');
      expect(target.index).toBe(1);
    });

    it('computes on-container target for on position on column', () => {
      const target = computeDropTarget(
        ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0],
        ['pages', 0, 'rows', 0, 'columns', 1],
        'column',
        'on'
      );
      expect(target.type).toBe('on-container');
      expect(target.parentPath).toEqual(['pages', 0, 'rows', 0, 'columns', 1]);
    });

    it('computes on-container target for on position on page', () => {
      const target = computeDropTarget(
        ['pages', 0, 'components', 0],
        ['pages', 1],
        'page',
        'on'
      );
      expect(target.type).toBe('on-container');
    });

    it('returns invalid for row targets', () => {
      const target = computeDropTarget(
        ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0],
        ['pages', 0, 'rows', 1],
        'row',
        'on'
      );
      expect(target.type).toBe('invalid');
    });

    it('returns invalid for dataset targets', () => {
      const target = computeDropTarget(
        ['pages', 0, 'components', 0],
        ['datasets', 0],
        'dataset',
        'on'
      );
      expect(target.type).toBe('invalid');
    });
  });

  describe('isValidDrop', () => {
    it('accepts between targets', () => {
      expect(isValidDrop('component', {
        type: 'between',
        parentPath: ['pages', 0, 'components'],
        index: 1,
      })).toBe(true);
    });

    it('accepts on-container targets', () => {
      expect(isValidDrop('component', {
        type: 'on-container',
        parentPath: ['pages', 0, 'rows', 0, 'columns', 0],
        index: 0,
      })).toBe(true);
    });

    it('rejects invalid targets', () => {
      expect(isValidDrop('component', {
        type: 'invalid',
        parentPath: [],
        index: 0,
      })).toBe(false);
    });
  });
});
