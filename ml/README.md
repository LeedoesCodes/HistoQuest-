# ML — Engagement Classifier

Trains the logistic-regression model that labels a pupil **Surface** or **Deep**
learner from their in-game behavior (History module). Objective: ≥80% accuracy
against teacher-assessed ground truth.

## Files

- `engagement_classifier.ipynb` — the training notebook (runs in Google Colab;
  only needs numpy / pandas / scikit-learn, all preinstalled in Colab).

## How to use

1. Open the notebook in [Google Colab](https://colab.research.google.com/)
   (upload it, or File → Open notebook → Upload).
2. Run all cells. It currently trains on **synthetic** data so the whole
   pipeline works before the pilot (test acc ~0.91, CV ~0.94).
3. Copy the generated `MODEL_WEIGHTS` / `MODEL_BIAS` / `FEATURE_SCALE` lines
   into [`src/game/classifier.ts`](../src/game/classifier.ts).

## When you have real pilot data

Replace section **2b** in the notebook:

- Export `history_behavior_logs` from Supabase → `pilot_events`.
- Collect teacher labels (1 = deep, 0 = surface) per `session_id`.
- The `features_from_events()` helper mirrors `extractFeatures()` in
  `classifier.ts`, so training features match the app's inference features.
- Re-run, re-export the weights, paste them back in.

## Why no ML server

A logistic regression is just weights: `sigmoid(w · x + b)`. The notebook folds
the StandardScaler into the coefficients, so inference is a dot product the
browser does in `classifier.ts` — zero ML infrastructure, zero cost.
