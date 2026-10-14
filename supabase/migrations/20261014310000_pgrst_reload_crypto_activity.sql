-- PostgREST caches function volatility; reload after crypto_my_activity read-path change.

notify pgrst, 'reload schema';
