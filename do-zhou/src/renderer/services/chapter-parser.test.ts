import { describe, it, expect } from 'vitest'
import { parseChapterIndex, validateConsistency } from './chapter-parser'

describe('chapter-parser', () => {
  describe('parseChapterIndex', () => {
    it('解析标准格式 → 提取章节号和标题', () => {
      const content = '**第1章** 婚礼上的陌生人\n**第2章** 契约婚姻的开始'
      const result = parseChapterIndex(content)
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].number).toBe(1)
      expect(result.entries[0].title).toBe('婚礼上的陌生人')
      expect(result.entries[0].fileName).toBe('Chapter-01.md')
      expect(result.entries[1].number).toBe(2)
      expect(result.entries[1].fileName).toBe('Chapter-02.md')
    })

    it('空内容 → 空结果', () => {
      const result = parseChapterIndex('')
      expect(result.entries).toHaveLength(0)
      expect(result.totalInIndex).toBe(0)
    })

    it('无匹配格式 → 空结果', () => {
      const result = parseChapterIndex('普通文字没有章节格式')
      expect(result.entries).toHaveLength(0)
    })

    it('两位数章节 → 正确格式化', () => {
      const result = parseChapterIndex('**第12章** 大结局')
      expect(result.entries[0].fileName).toBe('Chapter-12.md')
    })
  })

  describe('validateConsistency', () => {
    it('一致 → consistent=true', () => {
      const entries = [
        { number: 1, title: 'Ch1', fileName: 'Chapter-01.md', exists: true },
        { number: 2, title: 'Ch2', fileName: 'Chapter-02.md', exists: true },
      ]
      const files = ['Chapter-01.md', 'Chapter-02.md']
      const result = validateConsistency(entries, files)
      expect(result.consistent).toBe(true)
      expect(result.totalInIndex).toBe(2)
      expect(result.totalFiles).toBe(2)
    })

    it('不一致 → consistent=false', () => {
      const entries = [
        { number: 1, title: 'Ch1', fileName: 'Chapter-01.md', exists: true },
        { number: 2, title: 'Ch2', fileName: 'Chapter-02.md', exists: true },
      ]
      const files = ['Chapter-01.md', 'Chapter-02.md', 'Chapter-03.md']
      const result = validateConsistency(entries, files)
      expect(result.consistent).toBe(false)
      expect(result.totalFiles).toBe(3)
    })

    it('缺失文件 → exists=false', () => {
      const entries = [
        { number: 1, title: 'Ch1', fileName: 'Chapter-01.md', exists: true },
        { number: 2, title: 'Ch2', fileName: 'Chapter-02.md', exists: true },
      ]
      const files = ['Chapter-01.md']
      const result = validateConsistency(entries, files)
      expect(result.entries[1].exists).toBe(false)
    })
  })
})
