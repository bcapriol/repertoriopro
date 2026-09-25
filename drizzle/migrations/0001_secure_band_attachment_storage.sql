CREATE POLICY "Anexos privados via servidor"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'anexos')
WITH CHECK (bucket_id = 'anexos');