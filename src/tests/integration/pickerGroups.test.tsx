import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionLibraryPicker } from '../../features/routines/components/ActionLibraryPicker';
import type { Action } from '../../domain/action/Action';

function makeAction(overrides: Partial<Action> & { id: string; name: string }): Action {
  return {
    defaultDurationSec: 30,
    sideMode: 'single',
    category: [],
    bodypart: [],
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z',
    ...overrides,
  } as Action;
}

describe('新建流程从动作库添加 (总数+分组筛选)', () => {
  const actions = [
    makeAction({ id: 'a1', name: '颈部拉伸', bodypart: ['颈'] }),
    makeAction({ id: 'a2', name: '高抬腿', category: ['热身'], bodypart: ['腿'] }),
  ];

  it('标题显示总数并按场景分组', () => {
    render(
      <ActionLibraryPicker visible actions={actions} onClose={() => {}} onConfirm={() => {}} />,
    );
    expect(screen.getByText('从动作库添加（共 2 个）')).toBeTruthy();
    expect(screen.getByTestId('library-group-拉伸-header')).toBeTruthy();
    expect(screen.getByTestId('library-group-热身-header')).toBeTruthy();
    // 默认仅拉伸组展开
    expect(screen.getByTestId('picker-action-a1')).toBeTruthy();
    expect(screen.queryByTestId('picker-action-a2')).toBeNull();
  });

  it('搜索全局生效并自动展开', () => {
    render(
      <ActionLibraryPicker visible actions={actions} onClose={() => {}} onConfirm={() => {}} />,
    );
    fireEvent.changeText(screen.getByTestId('library-search'), '高抬腿');
    expect(screen.getByTestId('picker-action-a2')).toBeTruthy();
  });

  it('多选确认保持点选顺序', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<ActionLibraryPicker visible actions={actions} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.press(screen.getByTestId('picker-action-a1'));
    fireEvent.press(screen.getByText(/添加 \(1\)/));
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ id: 'a1' })]);
  });
});
