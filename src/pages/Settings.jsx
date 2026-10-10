import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Share2, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { useStore, getState } from '../lib/store.js';
import { updateSettings, markExported, replaceAllData, resetAllData, saveTemplates } from '../lib/actions.js';
import { exportFilename, parseImport, serializeForExport } from '../lib/storage.js';
import { num } from '../lib/calc.js';
import { WEEKDAYS, relativeDay, toISODate } from '../lib/dates.js';
import { navigate } from '../lib/router.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, Field, IconButton, NumInput, Segmented, useToast } from '../components/ui.jsx';

function NumSetting({ field, label, hint, optional, suffix }) {
  const { settings } = useStore();
  const stored = settings[field];
  const [text, setText] = useState(stored == null ? '' : String(stored));

  // Pick up outside changes (e.g. after importing a backup) without
  // fighting the user while they type "0." etc.
  useEffect(() => {
    const same = text === '' ? stored == null || (!optional && stored === 0) : num(text) === stored;
    if (!same) setText(stored == null ? '' : String(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const onChange = (v) => {
    setText(v);
    if (v === '') {
      if (optional) updateSettings({ [field]: null });
      return;
    }
    const n = parseFloat(v);
    if (Number.isFinite(n)) updateSettings({ [field]: n });
  };

  return (
    <Field label={label} hint={hint}>
      <div className="row">
        <NumInput value={text} onChange={onChange} placeholder={optional ? 'Not set' : ''} className="grow" />
        {suffix && <span className="muted small" style={{ minWidth: 34 }}>{suffix}</span>}
      </div>
    </Field>
  );
}

function downloadBackup() {
  const blob = new Blob([serializeForExport(getState())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  markExported();
}

function backupFile() {
  return new File([serializeForExport(getState())], exportFilename(), { type: 'application/json' });
}

const canShareFiles = () => {
  try {
    return !!navigator.canShare?.({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
};

export default function Settings() {
  const state = useStore();
  const toast = useToast();
  const fileRef = useRef(null);
  const [persisted, setPersisted] = useState(null);
  const s = state.settings;

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
  }, []);

  const share = async () => {
    try {
      await navigator.share({ files: [backupFile()], title: 'Lift Log backup' });
      markExported();
    } catch (err) {
      if (err?.name !== 'AbortError') toast("Couldn't share. Try Export instead.");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = parseImport(await file.text());
      const summary = `${next.workouts.length} workouts, ${next.cardio.length} cardio sessions, ${next.weights.length} weigh-ins, ${next.foodLog.length} food entries`;
      if (!window.confirm(`Replace ALL current data with this backup?\n\nThe backup has ${summary}.\n\nTip: export first if you want to keep what's here now.`)) return;
      replaceAllData(next);
      toast('Backup restored');
    } catch (err) {
      window.alert(err.message || 'Could not read that file.');
    }
  };

  const reset = () => {
    const answer = window.prompt('This erases every workout, meal, weigh-in and setting on this device.\n\nType DELETE to confirm.');
    if (answer?.trim().toUpperCase() !== 'DELETE') return;
    resetAllData();
    toast('All data erased');
    navigate('/');
  };

  const setSchedule = (i, id) => {
    const weeklySchedule = [...s.weeklySchedule];
    weeklySchedule[i] = id || null;
    updateSettings({ weeklySchedule });
  };

  const moveTemplate = (i, dir) => {
    const list = [...state.templates];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    saveTemplates(list);
  };

  const lastExport = state.meta.lastExportAt ? relativeDay(toISODate(new Date(state.meta.lastExportAt))) : 'never';

  return (
    <>
      <TopBar title="Settings" back="/" hideSettings />
      <div className="page">
        <Card title="Daily nutrition targets">
          <div className="stack">
            <div className="grid-2">
              <NumSetting field="calorieTarget" label="Calories" suffix="cal" />
              <NumSetting field="proteinTarget" label="Protein" suffix="g" />
              <NumSetting field="carbTarget" label="Carbs (optional)" suffix="g" optional />
              <NumSetting field="fatTarget" label="Fat (optional)" suffix="g" optional />
            </div>
            <p className="small faint" style={{ margin: 0 }}>
              The defaults (2,800 cal / 160 g) are only placeholders, so set your own. Leave carbs and fat empty if you only track
              calories and protein. If your 4-week weight trend is slower than you want, nudge calories up by 100–200 and check
              again after a couple of weeks.
            </p>
          </div>
        </Card>

        <Card title="Bodyweight">
          <div className="grid-2">
            <NumSetting field="goalWeight" label="Goal weight" suffix="lb" />
            <NumSetting field="weeklyGainTarget" label="Target gain per week" suffix="lb" />
            <NumSetting field="startWeight" label="Starting weight" suffix="lb" hint="Pre-fills your first weigh-in" />
          </div>
        </Card>

        <Card title="Cardio">
          <NumSetting field="cardioTarget" label="Weekly zone 2 target" suffix="min" hint="150 min/week is a common goal" />
        </Card>

        <Card title="Training schedule">
          <div className="stack">
            <Segmented
              options={[
                { value: 'weekly', label: 'Fixed days' },
                { value: 'rotation', label: 'Rotation' },
              ]}
              value={s.scheduleMode}
              onChange={(v) => updateSettings({ scheduleMode: v })}
            />
            {s.scheduleMode === 'weekly' ? (
              <>
                <p className="small faint" style={{ margin: 0 }}>
                  Pick which workout goes on each day. Home shows today&apos;s.
                </p>
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className="row">
                    <span style={{ width: 44, fontWeight: 700 }}>{d}</span>
                    <select className="input grow" value={s.weeklySchedule[i] || ''} onChange={(e) => setSchedule(i, e.target.value)} aria-label={`${d} workout`}>
                      <option value="">Rest</option>
                      {state.templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="small faint" style={{ margin: 0 }}>
                  Home always shows the next workout after the one you did last, whatever day it is. Good if your days move around.
                  Order:
                </p>
                {state.templates.map((t, i) => (
                  <div key={t.id} className="row">
                    <span className="faint" style={{ width: 22 }}>
                      {i + 1}.
                    </span>
                    <span className="grow" style={{ fontWeight: 600 }}>
                      {t.name}
                    </span>
                    <IconButton label="Move up" onClick={() => moveTemplate(i, -1)} disabled={i === 0}>
                      <ArrowUp size={18} />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => moveTemplate(i, 1)} disabled={i === state.templates.length - 1}>
                      <ArrowDown size={18} />
                    </IconButton>
                  </div>
                ))}
              </>
            )}
            <Button variant="outline" block onClick={() => navigate('/lift')}>
              <Pencil size={16} /> Edit workout templates
            </Button>
          </div>
        </Card>

        <Card title="Backup & restore">
          <div className="stack">
            <p className="small muted" style={{ margin: 0 }}>
              Your data lives only in this browser on this device. Export a backup now and then, or before switching phones or
              clearing your browser. Last backup: <strong>{lastExport}</strong>.
            </p>
            <div className="grid-2">
              <Button variant="primary" onClick={downloadBackup}>
                <Download size={18} /> Export
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={18} /> Import
              </Button>
            </div>
            {canShareFiles() && (
              <Button variant="outline" block onClick={share}>
                <Share2 size={18} /> Share backup (Files, Drive, email…)
              </Button>
            )}
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
            {persisted === false && (
              <p className="small faint" style={{ margin: 0 }}>
                Tip: add this app to your home screen. That stops the browser from clearing its storage when space runs low.
              </p>
            )}
          </div>
        </Card>

        <Card title="Danger zone">
          <Button variant="danger" block onClick={reset}>
            Erase all data
          </Button>
        </Card>

        <p className="small faint" style={{ textAlign: 'center' }}>
          Lift Log · no accounts, no tracking, everything stays on your device.
        </p>
      </div>
    </>
  );
}
